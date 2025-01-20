import _ from "lodash"
import chalk from "chalk"
import cTable from "console.table"
import yaml from "js-yaml"
import fs from "node:fs"
import path from "node:path"
import * as u from "./util.js"
const { dv, error, info, verbose, isAccount } = u

// ----------------------------------------------------------------------------
// explain the show command
// ----------------------------------------------------------------------------
export async function explain() {
  info(chalk.blueBright("\nThe Show Command"))
  info(chalk.blueBright("------------------"))
  info(`The show command is used to display the configuration for an account. 
It can be used to list, index or reindex all accounts, show the configuration for 
a specific account.

  * If you pass no arguments, or "all" as the account name it will show account index,
    name and state, rules and filters of each account

  * If you pass "list" as the account name then the account list is displayed

  * If you pass "index" or "reindex" as the account name then the 
    the config is indexed and the account list is displayed

try mm show --help for more information
`)
}

/**
 * ----------------------------------------------------------------------------
 * show command
 * ----------------------------------------------------------------------------
 */
export async function showCommand(args, options, logger) {
  const config = u.setInstance({ args, options, logger })
  try {
    if (config == null || isAccount("list")) return

    // if the account is index and active is true then index active accounts
    // otherwise index all accounts
    if (isAccount("index")) {
      verbose(`indexing ${options.all ? "all" : "active"} accounts`)
      await indexAccounts(config, options)
      args.account = "list"
      u.setInstance({ args, options, logger })
      return
    }

    // an account name or index was passed and it was not "all"
    const account = u.isAccountAll() ? "all" : u.getAccount(config, options.account)
    if (account !== "all") {
      if (!account) {
        error("account not found")
        return
      }

      // if the all OPTION is not set then skip inactive accounts
      if (!account.active && !options.all) {
        info(`\nskipping ${account.account.name} (inactive)`)
        return
      }

      // if the folder option is set then show the folders
      if (options.folder) {
        showFolders(account)
        return
      }
    }

    const accounts = Object.keys(config)
    const cfglist = []
    for (const acct of accounts) {
      const account = config[acct]
      if (account.active || options.all) {
        cfglist.push(await getConfig(account))
      }
    }
    info(`\n${cTable.getTable(cfglist)}`)
  } catch (err) {
    if (options.verbose) verbose(chalk.red(err.stack))
    else error(err)
  }
}

// ----------------------------------------------------------------------------
// index accounts
// ----------------------------------------------------------------------------
const indexAccounts = async (config, options) => {
  let ndx = 1
  for (const account of Object.keys(config)) {
    if (!options.all && !config[account].active) {
      config[account].index = 0
    } else {
      config[account].index = ndx++
    }
    const configFile = path.join(dv.config_path, `${account}.yml`)
    verbose(`${configFile} indexed`)
    fs.writeFileSync(configFile, yaml.dump(config[account]))
  }
}

// ------------------------------------------------------------------------
// get the folders for the account
// ------------------------------------------------------------------------
const getFolders = async (acct) => {
  const { account } = acct
  const client = u.getImapFlow(account, true)
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
const showFolders = async (acct) => {
  const { account } = acct
  info(chalk.blue(`\n${acct.index}: ${account.name} folders\n`))
  const folders = await getFolders(acct)
  const headers = ["path", "parent", "name", "specialUse", "specialUseSource"]
  const values = _.map(folders.folders, (obj) => _.pick(obj, headers))
  info(cTable.getTable(values))
}

// ----------------------------------------------------------------------   --
// the configuration for the account
// ------------------------------------------------------------------------
const getConfig = async (acct) => {
  const { account } = acct
  return {
    index: acct.index,
    account: account.name,
    user: account.user,
    host: account.host,
    port: account.port
  }
}
