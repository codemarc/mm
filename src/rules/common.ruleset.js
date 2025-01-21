import cTable from "console.table"

import fs from "node:fs"
import path from "node:path"
import yaml from "js-yaml"
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
  const { account } = acct

  const catfile = path.join(process.cwd(), "data", `${account.name}.cats.yml`)
  const categoryRules = yaml.load(fs.readFileSync(catfile, "utf8"))
  verbose(`rule:move: loading ${catfile}`)

  // Get valid categories from cats.yml
  const cats = Object.entries(categoryRules || []).map(([key, value]) => key)
  verbose(`rule:move: using cats ${cats}`)

  const mbx = {}
  for (const cat of cats) {
    mbx[cat] = await u.getFolderPath(client, cat)
  }

  const src = await u.getFolderPath(client, rule?.move ?? "inbox")
  const lock = await client.getMailboxLock(src)
  verbose(`rule:move: ${src} mailbox locked`)

  const moved = []
  try {
    for (const msg of msglist) {
      await client.messageMove([msg.seq], mbx[msg.category])
      moved.push(msg)
      brief(`rule:move[${mbx[msg.category]}] moved ${msg.seq} ${msg.subject}`)
    }
  } catch (err) {
    error(chalk.red(err.stack))
  } finally {
    lock.release()
    verbose(`rule:move: ${src} mailbox unlocked`)
    verbose(`rule:move: moved ${moved.length} messages`)
  }
  return moved
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
    const filename = path.join(process.cwd(), "data", `${acct.account.name}.${rule.save}.json`)
    fs.writeFileSync(filename, JSON.stringify(msglist, null, 2))
    return msglist
  }

  const filename = path.join(process.cwd(), "data", `${acct.account.name}.${options.ruleset}.json`)
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

// ----------------------------------------------------------------------------
// classify rule
// ----------------------------------------------------------------------------
export async function classify(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args
  const { account } = acct

  // Load category rules from YAML file
  const catfile = path.join(process.cwd(), "data", `${account.name}.cats.yml`)
  const categoryRules = yaml.load(fs.readFileSync(catfile, "utf8"))
  verbose(`rule:classify: loading ${catfile}`)

  // Get valid categories from cats.yml
  const validCats = Object.entries(categoryRules || []).map(([key, value]) => key)
  verbose(`rule:classify: using cats ${validCats}`)

  const classifyMessage = (msg, categories) => {
    // Extract key fields from message
    const { senderEmail = "", subject = "", text = [] } = msg
    const content = [subject, ...(Array.isArray(text) ? text : [text])].join(" ").toLowerCase()

    // Score each category based on rules matches
    const scores = {}

    for (const [category, rules] of Object.entries(categoryRules)) {
      if (!categories.includes(category)) continue

      scores[category] = 0

      // Check domain matches
      if (
        rules.domains?.some((domain) => senderEmail.toLowerCase().includes(domain.toLowerCase()))
      ) {
        scores[category] += 5
      }

      // Check keyword matches
      if (rules.keywords?.some((keyword) => content.includes(keyword.toLowerCase()))) {
        scores[category] += 3
      }
    }

    // Find category with highest score
    let bestMatch = "undefined"
    let highScore = 0

    for (const [category, score] of Object.entries(scores)) {
      if (score > highScore) {
        highScore = score
        bestMatch = category
      }
    }
    return bestMatch
  }

  // Classify each message
  return msglist.map((msg) => ({
    ...msg,
    category: classifyMessage(msg, validCats)
  }))
}
