// Description: Utility functions for the mailman CLI.
// ImapFlow: https://imapflow.com/module-imapflow-ImapFlow.html
// lodash: https://lodash.com/docs/4.17.15
import { ImapFlow } from "imapflow"
import _ from "lodash"
import yaml from "js-yaml"
import fs from "node:fs"
import path from "node:path"
import { decrypt } from "./smash.js"
import chalk from "chalk"

let loggerInstance = null
let optionsInstance = null

export function setInstance(iv) {
  loggerInstance = iv.logger
  optionsInstance = iv.options
}

export function info(message) {
  if (!optionsInstance.quiet && !optionsInstance.brief) {
    ;(loggerInstance.info ?? console)(message)
  }
}
export function error(message) {
  if (!optionsInstance.quiet) {
    ;(loggerInstance.error ?? console)(chalk.red(message))
  }
}
export function verbose(message) {
  if (!optionsInstance.quiet && optionsInstance.verbose) {
    ;(loggerInstance.info ?? console)(chalk.blue(message))
  }
}
export function brief(message) {
  if (optionsInstance.brief) {
    ;(loggerInstance.info ?? console)(chalk.green(message))
  }
}

export function isAccountAll() {
  return optionsInstance.account === "all" || optionsInstance.account === "0"
}

/**
 * ----------------------------------------------------------------------------
 * Retrieves an account from the provided configuration based on the given alias.
 *
 * @param {Object} config - The configuration object containing the accounts
 * @param {Array} config.accounts - Array of account configurations
 * @param {string|number|boolean} [alias] - The alias or index of the account to retrieve.
 * @returns {Object|undefined} The account object if found, undefined otherwise
 * ---------------------------------------------------------------------------
 */
export function getAccount(config, alias) {
  if (typeof alias === "boolean" || alias === undefined) {
    // return _.first(config.accounts);
    return undefined
  }
  if (typeof alias === "string" && alias.length > 0) {
    const acct = _.find(config.accounts, { account: alias })
    if (acct) {
      return acct
    }
  }
  const accno = Number.parseInt(alias)
  if (Number.isNaN(accno) || accno.toString() !== alias) {
    return undefined
  }
  return config.accounts[accno - 1]
}

/**
 * ----------------------------------------------------------------------------
 * Gets a comma-separated list of account names from the configuration
 *
 * @param {Object} config - The configuration object containing the accounts
 * @param {Array} config.accounts - Array of account configurations
 * @returns {Array<string>} Array of account names
 * ----------------------------------------------------------------------------
 */
export function getAccountNames(config) {
  const accounts = config?.accounts
  if (!accounts) return []
  if (Array.isArray(accounts)) {
    return _.get(config, "accounts", [])
      .map((acc) => acc.account)
      .toString()
      .split(",")
      .filter(Boolean)
  }
  return Object.keys(accounts)
}

/**
 * ----------------------------------------------------------------------------
 * Retrieves the filter definitions for the specified account
 *
 * @param {string} account - The account name
 * @returns {Promise<Array<string>>} The filter definitions
 *
 * ----------------------------------------------------------------------------
 */
export async function getFiltersFor(account) {
  const filename = path.join(
    process.cwd(),
    process.env.MM_FILTERS_PATH ?? "filters",
    `${account}.yml`
  )
  if (!fs.existsSync(filename)) {
    return []
  }
  return yaml.load(fs.readFileSync(filename, "utf8"))
}

/**
 * ----------------------------------------------------------------------------
 * Refreshes account filters by loading additional filter definitions from files
 *
 * @param {Object} account - The account configuration to refresh
 * @param {Array<string>} [account.filters] - Array of filter definitions
 * @returns {Promise<Object>} The updated account configuration
 * ------------------------------------------------------------------------
 */
export async function refreshFilters(account) {
  if (account.filters) {
    for (const filter of account.filters) {
      const filename = path.join(
        process.cwd(),
        process.env.MM_FILTERS_PATH ?? "filters",
        `${account.account}.${filter}`
      )
      if (!fs.existsSync(filename)) {
        continue
      }
      const list = (await fs.promises.readFile(filename, "utf8")).split("\n")
      if (!account.lists) {
        account.lists = {}
      }
      account.lists[filter] = list.concat(account?.lists[filter] ?? [])
    }
  }
  return account
}

/**
 * ----------------------------------------------------------------------------
 * Prints account names to the logger in either quiet or verbose mode
 *
 * @param {Object} config - The configuration object containing the accounts
 * @param {Object} options - Command options
 * @param {boolean} options.quiet - Whether to print in quiet mode
 * @param {Object} logger - Logger instance
 * @param {Function} logger.info - Info logging function
 * ------------------------------------------------------------------------
 */
export function printAccountNames(config, options, logger) {
  const field = "account"
  if (options.quiet) {
    logger.info(_.map(config.accounts, field).toString().replace(/,/g, "\n"))
  } else {
    const accounts = _.map(config.accounts, field).toString().split(",")
    let count = 0
    for (const account of accounts) {
      logger.info(`${count + 1}. ${account}`)
      count++
    }
  }
}

/**
 * ----------------------------------------------------------------------------
 * Rounds a date to the nearest minute
 *
 * @param {Date|string|number} date - Date to round
 * @returns {Date} New date object rounded to minutes
 * @throws {Error} If the date is invalid
 * ------------------------------------------------------------------------
 */
export function roundToMinutes(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date")
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes())
}

/**
 * ----------------------------------------------------------------------------
 * Creates an ImapFlow instance for the given account
 *
 * @param {Object} account - Account configuration
 * @param {string} account.host - IMAP server host
 * @param {number} account.port - IMAP server port
 * @param {boolean} [account.tls] - Whether to use TLS
 * @param {string} account.user - Username
 * @param {string} account.password - Encrypted password
 * @param {Object} options - Command options
 * @param {boolean} options.verbose - Enable verbose logging
 * @param {Object} logger - Logger instance
 * @returns {ImapFlow} Configured ImapFlow instance
 * ------------------------------------------------------------------------
 */
export function getImapFlow(account, nologger) {
  return new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.tls !== false,
    auth: { user: account.user, pass: decrypt(account.password, false) },
    logger: nologger ? false : optionsInstance.verbose ? loggerInstance : false
  })
}

/**
 * ----------------------------------------------------------------------------
 * Gets the correct folder path accounting for Gmail's special folder structure
 * @param {Object} client - IMAP client instance
 * @param {string} name - Folder name to look up
 * @returns {Promise<string>} The correct folder path
 * ----------------------------------------------------------------------------
 *
 */
export async function getFolderPath(client, name) {
  if (name === undefined || name.toLowerCase() === "inbox") {
    return "INBOX"
  }
  const folders = await client.list()
  if (name === "Archive") {
    return _.find(folders, (f) => f.name === name)?.path ?? "[Gmail]/All Mail"
  }
  return _.find(folders, (f) => f.name === name)?.path
}

/**
 * ----------------------------------------------------------------------------
 * Default values for the CLI
 * ----------------------------------------------------------------------------
 */
export const dv = {
  accountAlias: process.env.MM_DEFAULT_ACCOUNT || "all",
  scanLimit: process.env.MM_SCAN_LIMIT || "12"
}

// ----------------------------------------------------------------------------
// Exports
// ----------------------------------------------------------------------------
export default {
  setInstance,
  info,
  error,
  verbose,
  brief,
  getImapFlow,
  isAccountAll,
  getAccount,
  getAccountNames,
  getFiltersFor,
  refreshFilters,
  printAccountNames,
  roundToMinutes,
  getFolderPath,
  dv
}
