import _ from "lodash"
import cTable from "console.table"
import { load } from "./smash.js"
import chalk from "chalk"
import u from "./util.js"
const { setInstance, getAccount, info, error, verbose } = u

// ------------------------------------------------------------------------
// list the accounts
// ------------------------------------------------------------------------
const listAccounts = (config, options, logger) => {
  const accountNames = u.getAccountNames(config)

  // must use logger directly to handle the quiet option
  if (options.quiet) {
    logger.info(accountNames.join("\n"))
    return
  }
  // print the accounts
  const headers = ["index", "account", "user", "host", "port"]
  const values = _.map(config.accounts, (obj) => _.pick(obj, headers))
  info(cTable.getTable(values))
  return
}

// ------------------------------------------------------------------------
// get the metrics for the account
// ------------------------------------------------------------------------
const getMetrics = async (account, options) => {
  const client = u.getImapFlow(account)
  try {
    await client.connect()

    let folder = "INBOX"
    if (options.folder && typeof options.folder === "string") {
      folder = options.folder
    }

    const src = await u.getFolderPath(client, folder)
    if (src === undefined) {
      error(`Folder ${account.account} ${folder} not found`)
      return {}
    }

    verbose(`gathering metrics for ${account.account} ${src}`)
    const lock = await client.getMailboxLock(src)

    let rc = {}
    try {
      const unread = await client.search({ unseen: true })
      const total = await client.search({ all: true })
      rc = {
        index: account.index,
        account: account.account,
        status: account.active === false ? "inactive" : "active",
        username: account.user,
        unread: unread.length.toLocaleString(),
        total: total.length.toLocaleString()
      }
    } catch (error) {
      logger.error(error)
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
// show the counts for the account
// ------------------------------------------------------------------------
const showCounts = async (config, options) => {
  info("\n")
  // if the account is all then show the counts for all accounts
  if (u.isAccountAll()) {
    const metrics = []
    for (const account of config.accounts) {
      const m = await getMetrics(account, options)
      metrics.push(m)
    }
    info(cTable.getTable(metrics))
    return
  }

  // otherwise show the counts for the account
  const account = getAccount(config, options.account)
  if (!account) {
    error(`account '${options.account}' not found\ncheck mm show -l for available accounts`)
    return
  }
  const metrics = await getMetrics(account, options)
  if (metrics) info(cTable.getTable([metrics]))
}

// ------------------------------------------------------------------------
// get the folders for the account
// ------------------------------------------------------------------------
const getFolders = async (account, options) => {
  const client = u.getImapFlow(account)
  try {
    await client.connect()

    const folders = await client.list()
    return {
      index: account.index,
      account: account.account,
      username: account.user,
      folders: folders
    }
  } catch (error) {
    error(error)
  } finally {
    await client.logout()
  }
}

// ------------------------------------------------------------------------
// show the folders for the account
// ------------------------------------------------------------------------
const showFolders = async (config, options) => {
  // if the account is all then show the folders for all accounts
  if (u.isAccountAll()) {
    for (const account of config.accounts) {
      info(chalk.blue(`${account.index}: ${account.account}\n`))
      const folders = await getFolders(account, options)

      // const headers = ["path","pathAsListed","flags","delimiter","listed","parentPath","parent","name","subscribed","specialUse","specialUseSource"
      const headers = ["path", "parent", "name", "specialUse", "specialUseSource"]
      const values = _.map(folders.folders, (obj) => _.pick(obj, headers))
      info(cTable.getTable(values))
    }
    return
  }

  // otherwise show the counts for the account
  const account = getAccount(config, options.account)
  if (!account) {
    error(`account '${options.account}' not found\ncheck mm show -l for available accounts`)
    return
  }
  info(chalk.blue(`\n${account.index}: ${account.account}\n`))

  const folders = await getFolders(account, options)
  const headers = ["path", "parent", "name", "specialUse", "specialUseSource"]
  const values = _.map(folders.folders, (obj) => _.pick(obj, headers))
  info(cTable.getTable(values))
}

// ------------------------------------------------------------------------
// Export the show command handler
// ------------------------------------------------------------------------
export const showCommand = async (args, options, logger) => {
  setInstance({ options: options, logger: logger })

  try {
    verbose("loading config")
    const config = load()

    // list the accounts
    if (options.list) {
      listAccounts(config, options, logger)
      return
    }

    // if no account is specified then use the default account
    options.account = args?.account ? args.account : u.dv.accountAlias
    verbose(`account: ${options.account}`)

    // if count is specified then show the counts for the account
    if (options.counts || process.argv.length === 3) {
      if (process.argv.length === 3) options.account = "all"
      showCounts(config, options)
      return
    }

    if (options.folder) {
      showFolders(config, options)
      return
    }

    // if the account is all then show the fully loaded config
    if (u.isAccountAll()) {
      logger.info(config)
      return
    }

    // otherwise show the config for the account
    const account = getAccount(config, options.account)
    if (!account) {
      error(`account '${options.account}' not found\ncheck mm show -l for available accounts`)
      return
    }

    info(account)
    info("\n")
  } catch (e) {
    error(e)
  }
}
