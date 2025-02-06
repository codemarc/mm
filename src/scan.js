import fetch from "./fetch.js"
import parsem from "./parse.js"
import { displayMessageCounts } from "./counts.js"
import util from "./util.js"
export const u = new util()

// =============================================================================
// scan command
//
// The scan command is used to scan email folders. I has a large number of
// options to control how to scan. If you do not specify the account name,
// it will show the index, account,username, and message counts for all
// active accounts.
//
// Use mm scan --help for more information.
//
// =============================================================================
export async function scanCommand(args, options, logger) {
  const config = u.setInstance({ args, options, logger })

  try {
    if (config == null) return

    // get message counts from all
    if (!args.account && !options.ruleset) {
      await displayMessageCounts(config, options)
      return
    }

    // get the account
    const acct = u.getAccount(config, args.account)
    if (!acct) return

    // if the all option is not set then skip inactive accounts
    if (!acct.active && !options.all) {
      u.error(`account ${acct.account} is (inactive). use -a treat as active`)
      return
    }

    // if ruleset is specified but unamed then use the default ruleset
    if (typeof options.ruleset === "boolean" && options.ruleset === true) {
      options.ruleset = u.dv.rulesSet
      u.verbose(`using default ruleset: ${options.ruleset}`)
    }

    if (options.ruleset === false) {
      u.verbose("simple scan reqested, skipping rules")
      const anwerset = await runSimpleScan(acct)
      u.verbose(`${anwerset.length} messages matched ${acct.account}`)
      for (const msg of anwerset) {
        u.verbose(`scan:${msg.index}:${msg.seq}[${msg.category}] ${msg.subject}`)
      }
      return
    }

    // run rules for the account
    const msgs = await runScanRules(acct, args, options)

    // // display the results
    // if ((msgs?.length ?? 0) > 0) {
    //   const total = msgs.map((msg) => msg?.length ?? 0).reduce((a, b) => a + b, 0)
    //   verbose(`${total} messages matched across ${msgs.length} accounts`)
    //   for (const anwerset of msgs) {
    //     for (const msg of anwerset) {
    //       verbose(`scan:${msg.index}:${msg.seq}[${msg.category}] ${msg.subject}`)
    //     }
    //   }
    // }
  } catch (err) {
    if (options.verbose) u.verbose(err.stack)
    else u.error(err)
  }
}

// ----------------------------------------------------------------------------
// runSimpleScan
// ----------------------------------------------------------------------------
const runSimpleScan = async (acct, args, options) => {
  let answerset = []
  const client = u.getImapFlow(acct, true)
  try {
    await client.connect()
    const msglist = await fetch(client, u.options)
    if (msglist.length === 0) return answerset
    answerset = await parsem(msglist)
  } catch (err) {
    if (u.options.verbose) u.verbose(err.stack)
    else u.error(err)
  } finally {
    await client.logout()
  }
  return answerset
}

// ----------------------------------------------------------------------------
// runScanRules
// ----------------------------------------------------------------------------
const runScanRules = async (acct, args, options) => {
  const results = []
  u.verbose(`loading rulesets for ${acct.account}`)

  const rulesets = u.loadRuleSets()

  if (rulesets.length === 0) {
    u.error("no ruleset found")
    return results
  }

  const client = u.getImapFlow(acct, true)
  try {
    await client.connect()
    for (const ruleset of rulesets.rules) {
      if (!ruleset) continue
      if (!ruleset.active === false) continue
      if (ruleset.set !== options.ruleset) continue

      const erules = await u.loadRules(ruleset)
      let eresults = []

      // run the rules
      for (const rule of ruleset.rule) {
        const ruleName = typeof rule === "string" ? rule : Object.keys(rule)[0]
        const ruleArgs = typeof rule === "string" ? [] : [rule]
        if (typeof erules[ruleName] !== "function") throw new Error(`${ruleName} is not defined`)
        eresults = await erules[ruleName](eresults, acct, options, client, ruleset, ...ruleArgs)
      }
      // save the results
      results.push(eresults)
    }
  } catch (err) {
    if (options.verbose) u.verbose(u.red(err.stack))
    else u.error(err)
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
    for (const acct of config.accounts) {
      if (!acct.active) {
        u.verbose(`skipping ${acct.account} (inactive)`)
        continue
      }

      // see if it matches the account name or index
      if (acct.account !== options.account && account?.index?.toString() !== options.account)
        continue

      verbose(`account: ${acct}`)
      msglist.push(...(await runScanRules(account, options)))
    }
    return msglist
  } catch (err) {
    if (options.verbose) u.verbose(err.stack)
    else u.error(err)
  }
}
