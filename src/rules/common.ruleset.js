import cTable from "console.table"

import fs from "node:fs"
import path from "node:path"
import chalk from "chalk"
import { parsem } from "../parse.js"
import fetch from "../fetch.js"
import * as u from "../util.js"
const { dv, brief, error, info, verbose } = u

// ----------------------------------------------------------------------------
// exit rule
// ----------------------------------------------------------------------------
export async function exit(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args
  verbose("rule:exit")

  if (rule?.exit) {
    // if exit is a number then exit with that number
    // use echo $? to get the exit code
    process.exit(Number.parseInt(rule.exit))
  }
  process.exit(0)
}

// ----------------------------------------------------------------------------
// check rule
// ----------------------------------------------------------------------------
export async function check(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args

  const fcheck = async (folder) => {
    verbose(`rule:check: checking for folder ${folder}`)
    const folderExists = await u.getFolderPath(client, folder)
    if (!folderExists) {
      verbose(chalk.red(`rule:check: folder ${folder} is missing`))
    } else {
      verbose(`rule:check: folder ${folder} exists`)
    }
  }
  for (const ndx in ruleset.folders) {
    const folder = Number.isNaN(Number.parseInt(ndx))
      ? ruleset.folders[ndx]
      : Object.values(ruleset.folders[ndx])[0]
    await fcheck(folder)
  }
  return msglist
}

// ----------------------------------------------------------------------------
// pick rule
// ----------------------------------------------------------------------------
export async function pick(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args
  const picklist = typeof rule?.pick === "string" ? [rule.pick] : (rule?.pick ?? ["unread"])
  brief(`rule:pick: ${picklist}`)
  if (picklist.includes("unread")) options.unread = true
  if (picklist.includes("tagged")) options.tagged = true
  const msgs = await fetch(client, options)
  return msgs
}

// ----------------------------------------------------------------------------
// parse rule
// ----------------------------------------------------------------------------
export async function parse(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args
  if (msglist.length === 0) return msglist
  const answerset = await parsem(msglist)
  return answerset
}

// ----------------------------------------------------------------------------
// match rule
// ----------------------------------------------------------------------------
export async function match(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args

  // iterate over the msglist and match the rule.match
  const matched = []
  for (const msg of msglist) {
    for (const item of rule.match?.senderEmail || []) {
      if (
        item.is === msg.senderEmail ||
        item.equals === msg.senderEmail ||
        msg.senderEmail.endsWith(item.domain)
      ) {
        matched.push(msg)
      }
    }
  }
  verbose(`rule:match: matched ${matched.length} messages`)
  return matched
}

// ----------------------------------------------------------------------------
// mark rule
// ----------------------------------------------------------------------------
export async function mark(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args
  const marklist = msglist.map((msg) => msg.seq)
  if (marklist.length === 0) return msglist
  const flagslist = typeof rule?.mark === "string" ? [rule.mark] : (rule?.mark ?? ["read"])
  brief(`rule:pick: ${flagslist}`)
  const flags = []
  if (flagslist.includes("read")) flags.push("\\Seen")
  if (flagslist.includes("star")) flags.push("\\Flagged")
  if (flagslist.includes("delete")) flags.push("\\Deleted")
  if (flagslist.includes("flag")) flags.push("\\Flagged")
  if (flagslist.includes("unflag")) flags.push("\\Flagged")
  if (flagslist.includes("unread")) flags.push("\\Unseen")
  if (flagslist.includes("unstar")) flags.push("\\Flagged")
  if (flagslist.includes("unflag")) flags.push("\\Flagged")
  await client.messageFlagsAdd(marklist, flags)
  return msglist
}

// ----------------------------------------------------------------------------
// move rule
// ----------------------------------------------------------------------------
export async function move(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args

  const mvlist = msglist.map((msg) => msg.seq)
  if (mvlist.length === 0) return msglist

  const src = await u.getFolderPath(client, rule.move?.from ?? options.folder)
  if (src === undefined) {
    error(chalk.red(`rule:move: source folder ${rule.move?.from ?? options.folder} is missing`))
    return msglist
  }
  const dst = await u.getFolderPath(client, rule.move?.to)
  if (dst === undefined) {
    error(chalk.red(`rule:move: target folder ${rule.move?.to} is missing`))
    return msglist
  }

  const lock = await client.getMailboxLock(src)
  verbose(`rule:move: ${src} mailbox locked`)
  try {
    await client.messageMove(mvlist, dst)
    info(chalk.green(`Moved ${msglist.length} messages to ${dst}`))
  } catch (err) {
    if (options.verbose) verbose(chalk.red(err.stack))
    else error(err)
  } finally {
    lock.release()
    verbose(`rule:move: ${src} mailbox unlocked`)
  }
  return msglist
}

// ----------------------------------------------------------------------------
// subject rule
// ----------------------------------------------------------------------------
export async function subject(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args
  const answer = []
  for (const msg of msglist) answer.push(msg.subject)
  return answer
}

// ----------------------------------------------------------------------------
// save rule
// ----------------------------------------------------------------------------
export async function save(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args

  if (rule?.save) {
    if (rule.save.endsWith(".json")) {
      fs.writeFileSync(rule.save, JSON.stringify(msglist, null, 2))
      return msgs
    }
    if (!options.folder) options.folder = rule.save
  }

  const filename = path.join(
    path.join(process.cwd(), "data"),
    `${acct.account.name}.${!options.folder ? options.ruleset : options.folder}.json`
  )
  fs.writeFileSync(filename, JSON.stringify(msglist, null, 2))
  return msglist
}

// ----------------------------------------------------------------------------
// load rule
// ----------------------------------------------------------------------------
export async function load(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args

  if (rule?.load) {
    if (fs.existsSync(rule.load)) {
      return JSON.parse(fs.readFileSync(rule.load, "utf8"))
    }
    if (!options.folder) options.folder = rule.load
  }

  const filename = path.join(
    path.join(process.cwd(), "data"),
    `${acct.account.name}.${!options.folder ? options.ruleset : options.folder}.json`
  )
  if (!fs.existsSync(filename)) {
    error(chalk.red(`rule:load: file ${filename} is missing`))
    return msglist
  }
  return JSON.parse(fs.readFileSync(filename, "utf8"))
}

// ----------------------------------------------------------------------------
// drop rule
// ----------------------------------------------------------------------------
export async function drop(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args
  if (msglist.length === 0) return msglist

  // reload the saved msglist
  let saved = await load(msglist, acct, options, client, ruleset, rule)
  if (saved.length === 0) return msglist

  // remove the msglist from the saved list
  for (const msg of msglist) {
    saved = saved.filter((m) => m.seq !== msg.seq)
  }

  // save back the results
  await save(saved, acct, options, client, ruleset, rule)
  return msglist
}
