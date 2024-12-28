import _ from "lodash"
import cTable from "console.table"
import { load } from "./smash.js"
import chalk from "chalk"
import u from "./util.js"

// ------------------------------------------------------------------------
// list the accounts
// ------------------------------------------------------------------------
const listAccounts = (config, options, logger) => {
  const accountNames = u.getAccountNames(config)
  if (options.quiet) {
    logger.info(accountNames.join('\n'))
    return
  }
  // print the accounts
  const headers = ["index", "account", "user", "host", "port"]
  const values = _.map(config.accounts, (obj) => _.pick(obj, headers))
  logger.info(cTable.getTable(values))
  return
}

// ------------------------------------------------------------------------
// show the counts for the account
// ------------------------------------------------------------------------
const showCounts = async (config, options, logger) => {

  const getMetrics = async (account) => {
    const client = u.getImapFlow(account, options, logger)
    try {
      await client.connect()
      const lock = await client.getMailboxLock(options.folder ?? "INBOX")
      const unread = await client.search({ unseen: true })
      const total = await client.search({ all: true })
      lock.release()
      return {
        index: account.index,
        account: account.account,
        username: account.user,
        unread: unread.length.toLocaleString(),
        total: total.length.toLocaleString(),
      }
    } catch (error) {
      logger.error(error)
    } finally {
      await client.logout()
    }

  }

  // if the account is all then show the counts for all accounts
  if (options.account === "all") {
    const metrics = await Promise.all(
      _.map(config.accounts, async (account) => {
        return getMetrics(account)
      })
    )
    logger.info(cTable.getTable(metrics))
    return
  }

  // otherwise show the counts for the account
  const account = u.getAccount(config, options.account)
  if (!account) {
    logger.error(chalk.red("not found\n"))
    return
  }
  const metrics = await getMetrics(account)
  logger.info(cTable.getTable([metrics]))
}

// ------------------------------------------------------------------------
// show the folders for the account
// ------------------------------------------------------------------------
const showFolders = async (config, options, logger) => {
  const getFolders = async (account) => {
    const client = u.getImapFlow(account, options, logger)
    try {
      await client.connect()

      const folders = await client.list()
      return {
        index: account.index,
        account: account.account,
        username: account.user,
        folders: folders,
      }
    } catch (error) {
      logger.error(error)
    } finally {
      await client.logout()
    }
  }

  // if the account is all
  if (options.account === "all") {
    logger.error(chalk.red("show folders not implemented for all accounts"))
    return
  }

  // otherwise show the counts for the account
  const account = u.getAccount(config, options.account)
  if (!account) {
    logger.error(chalk.red("not found\n"))
    return
  }
  const folders = await getFolders(account)
  logger.info(chalk.blue(`\n${account.index}: ${account.account}\n`))

  // const headers = ["path","pathAsListed","flags","delimiter","listed","parentPath","parent","name","subscribed","specialUse","specialUseSource"
  const headers = [
    "path",
    "parent",
    "name",
    "specialUse",
    "specialUseSource",
  ]
  const values = _.map(folders.folders, (obj) => _.pick(obj, headers))
  logger.info(cTable.getTable(values))
}



// ------------------------------------------------------------------------
// Export the show command handler
// ------------------------------------------------------------------------
export const showCommand = async (args, options, logger) => {
  const config = load()
  
  // list the accounts
  if (options.list) {
    listAccounts(config, options, logger)
    return
  }

  // if no account is specified then use the default account
  options.account = args?.account ? args.account : (process.env.MM_DEFAULT_ACCOUNT ?? "all")
  if (options.verbose) logger.info(`account: ${options.account}`)

  // if count is specified then show the counts for the account
  if (options.counts || process.argv.length === 3) {
    if(process.argv.length === 3)options.account="all"
    showCounts(config, options, logger)
    return
  }

  if (options.folders) {
    showFolders(config, options, logger)
    return
  }

  // if the account is all then show the fully loaded config
  if (options.account === "all") {
    logger.info(config)
    return
  }

  // otherwise show the config for the account
  const account = u.getAccount(config, options.account)
  if (!account) {
    logger.error(chalk.red("not found\n"))
    return
  }

  logger.info(account)
  logger.info("\n")
}
