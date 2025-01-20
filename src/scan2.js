import fs from "node:fs"
import path from "node:path"
import chalk from "chalk"
import cTable from "console.table"
import fetch from "./fetch.js"
import * as u from "./util.js"
const { dv, brief, error, info, verbose } = u

// ----------------------------------------------------------------------------
// explain the scan command
// ----------------------------------------------------------------------------
export async function explain() {
  info(chalk.blueBright("\nThe Scan Command"))
  info(chalk.blueBright("------------------"))
  info(`The scan command is used to scan email folders using rules.
It can be used to scan all accounts, a specific account, or a specific folder.

    * If you specify the account name as list, it will show the index, name, status, unread, total
      rules and filter counts for all accounts. If you add folder option then it will show the
      unread, total counts for that folder.

    * If you specify the account name as a specific account name, it will scan that account.

      try mm scan --help for more information
`)
}

/**
 * ----------------------------------------------------------------------------
 * scan command
 * ----------------------------------------------------------------------------
 */
export async function scanCommand(args, options, logger) {
  const config = u.setInstance({ args, options, logger })

  brief("scan-starts")
  try {
    if (config == null) return

    // get message counts from all
    if (u.isAccountAll() && !options.ruleset) {
      await displayMessageCounts(config, options)
      return
    }

    // if ruleset is specified but unamed then use the default ruleset
    if (typeof options.ruleset === "boolean") {
      options.ruleset = dv.rulesSet
    }

    // scan the active accounts
    const msgs = await scanActiveAccounts(config, options)

    // display the results
    if ((msgs?.length ?? 0) > 0) {
      const total = msgs.map((msg) => msg?.length ?? 0).reduce((a, b) => a + b, 0)
      verbose(`${total} messages matched across ${msgs.length} accounts`)
      for (const anwerset of msgs) {
        for (const msg of anwerset) {
          verbose(`scan:[${msg.index}]:[${msg.seq}] ${msg.subject}`)
        }
      }
    }
  } catch (err) {
    error(err.message)
  } finally {
    brief("scan-ends")
  }
}

// ----------------------------------------------------------------------------
// runScanRules
// ----------------------------------------------------------------------------
const runScanRules = async (acct, options) => {
  const { account } = acct
  verbose(`finding rules for: ${account.name}`)

  // see if the account has rules
  if (!acct.rules) {
    info("no rules found for account")
  }

  // get the rulesets
  let rulesets = options.ruleset === "all" ? acct.rules : []
  if (rulesets.length === 0) {
    const found = acct.rules.find((rule) => rule.set === options.ruleset)
    rulesets = found ? [found] : []
  }

  verbose(`rulesets: ${rulesets.length}`)
  if (rulesets.length === 0) {
    error(`no ruleset found for: ${options.ruleset}`)
    return []
  }

  const results = []
  const client = u.getImapFlow(account, true)

  try {
    await client.connect()
    for (const ruleset of rulesets) {
      if (!ruleset) continue
      const rulesetFile = path.normalize(
        path.join(process.cwd(), dv.rulesFolder, `${ruleset.file ?? dv.rulesFile}.ruleset.js`)
      )
      if (!fs.existsSync(rulesetFile)) {
        error(`rule file not found: ${rulesetFile}`)
        continue
      }

      verbose(chalk.green("-".repeat(63)))
      verbose(chalk.green(`ruleset: ${ruleset.set} ${ruleset.desc ?? ""}`))
      verbose(chalk.green(`   file: ${rulesetFile}`))
      verbose(chalk.green("-".repeat(63)))

      // since the rules file extsts we need to scan messages based on the rules folders
      if (ruleset.folders?.src) {
        options.folder = ruleset.folders.src
      }

      // load the rule file
      const erules = await import(rulesetFile)
      let eresults = []

      // run the rules
      for (const rule of ruleset.rule) {
        const ruleName = typeof rule === "string" ? rule : Object.keys(rule)[0]
        const ruleArgs = typeof rule === "string" ? [] : [rule]
        brief(`rule:${ruleName} ${ruleArgs.length}`)
        eresults = await erules[ruleName](eresults, acct, options, client, ruleset, ...ruleArgs)
      }
      // save the results
      results.push(eresults)
    }
  } catch (err) {
    if (options.verbose) verbose(chalk.red(err.stack))
    else error(err)
  } finally {
    await client.logout()
  }

  return results
}

// ------------------------------------------------------------------------
// scan the active accounts and folders
// ------------------------------------------------------------------------
const scanActiveAccounts = async (config, options) => {
  const msglist = []
  try {
    const accounts = Object.keys(config)

    for (const acct of accounts) {
      const account = u.getAccount(config, acct)

      // skip inactive accounts unless options.all is set
      if (!options.all && !account.active) continue

      // if the account in options.account is no 'all'
      // then see if it matches the account name or index
      if (
        options.account !== "all" &&
        acct !== options.account &&
        account?.index?.toString() !== options.account
      )
        continue

      verbose(`account: ${acct}`)
      msglist.push(...(await runScanRules(account, options)))
    }
    return msglist
  } catch (err) {
    error(err.message)
  }
}

// ------------------------------------------------------------------------
// get the stats for an account
// ------------------------------------------------------------------------
const getMessageStats = async (acct) => {
  let rc = {}
  const { account } = acct

  const client = u.getImapFlow(account, true)
  try {
    await client.connect()

    const folder = "INBOX"
    const src = await u.getFolderPath(client, folder)
    if (src === undefined) {
      error(`Folder ${account.name} ${folder} not found`)
      return rc
    }

    verbose(`gathering stats for ${account.name} ${src}`)
    const lock = await client.getMailboxLock(src)

    try {
      const status = await client.status(src, {
        messages: true,
        recent: true,
        unseen: true,
        highestModseq: true
      })
      const { messages, unseen, highestModseq } = status
      rc = {
        index: acct.index,
        account: account.name,
        //status: acct.active === false ? "inactive" : "active",
        username: account.user,
        //folder: src,
        unread: unseen.toLocaleString(),
        total: messages.toLocaleString(),
        hwm: highestModseq.toLocaleString()
      }
      brief(`  ${account.name} ${unseen.toLocaleString()} of ${messages.toLocaleString()}`)
    } catch (error) {
      error(error)
    } finally {
      lock.release()
    }
    return rc
  } catch (err) {
    error(err?.responseText ?? err)
  } finally {
    await client.logout()
  }
}

// ------------------------------------------------------------------------
// display the message counts for all accounts
// ------------------------------------------------------------------------
const displayMessageCounts = async (config, options) => {
  const accounts = Object.keys(config)
  const msglist = []
  for (const acct of accounts) {
    const account = config[acct]
    if (account.active || options.all) {
      msglist.push(await getMessageStats(account))
    }
  }
  info(`\n${cTable.getTable(msglist)}`)
}
