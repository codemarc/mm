import cTable from "console.table"
import util from "./util.js"
export const u = new util()

// =============================================================================
// check command
//
// The check command is used to check an email account. It will validate the
// folder structure and update the folder structure if necessary.
//
// Use mm check --help for more information.
//
// =============================================================================
export async function checkCommand(args, options, logger) {
  const config = u.setInstance({ args, options, logger })

  try {
    if (config == null) return

    if (args.account === "list") {
      listAccounts(config)
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

    checkAccount(acct)
  } catch (err) {
    if (options.verbose) u.verbose(err.stack)
    else u.error(err)
  }
}

// ------------------------------------------------------------------------
// list the accounts
// ------------------------------------------------------------------------
const listAccounts = (config) => {
  const accounts = config.accounts.map((acct) => ({
    index: acct.index,
    account: acct.account,
    user: acct.user,
    active: acct.active
  }))
  u.info(`\n${cTable.getTable(accounts)}`)
}

// ------------------------------------------------------------------------
// check an account
// ------------------------------------------------------------------------
const checkAccount = async (acct) => {
  u.brief(`checking account [${acct.index}]:${acct.account}/${acct.user}`)

  const client = await u.getImapFlow(acct, true)
  try {
    await client.connect()
    const folders = await client.list()
    const table = folders.map((folder) => ({
      name: folder.name,
      path: folder.path,
      parent: folder.parent
    }))
    if (u.getOptions().verbose) u.info(`\n${cTable.getTable(table)}`)

    // check to see if INBOX has a child folder named _mm
    const inbox = await u.getFolderPath(client, "INBOX")

    const checkFolder = async (prompt, path) => {
      u.brief(`checking path: ${path}`)
      const rc = await u.getFolderPath(client, path)

      if (rc === undefined) {
        u.error(`${prompt} does not exist`)
        if (!acct.active) return
        const info = await client.mailboxCreate(path)
        u.info(`create ${info.path} => ${info.created}`)
      } else {
        u.info(`${prompt}: ok`)
      }
      return rc
    }

    // check to see if the inbox has a child folder named _mm
    await checkFolder("mm", `${inbox}/_mm`)

    // check to see if  _mm has the correct children
    const children = [
      { prompt: "delegate", path: `${inbox}/_mm/Delegate` },
      { prompt: "later", path: `${inbox}/_mm/Later` },
      { prompt: "now", path: `${inbox}/_mm/Now` },
      { prompt: "reply", path: `${inbox}/_mm/Reply` },
      { prompt: "review", path: `${inbox}/_mm/Review` },
      { prompt: "schedule", path: `${inbox}/_mm/Schedule` },
      { prompt: "track", path: `${inbox}/_mm/Track` }
    ]
    for (const child of children) {
      await checkFolder(child.prompt, child.path)
    }
    u.info("all folders checked: ok")
    return folders
  } catch (err) {
    u.error(err)
    return []
  } finally {
    await client.logout()
  }
}
