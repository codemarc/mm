// ----------------------------------------------------------------------------
// Utility functions for mm CLI.
// ----------------------------------------------------------------------------

// crypto: https://nodejs.org/api/crypto.html
import crypto from "node:crypto"

// fs: https://nodejs.org/api/fs.html
import fs from "node:fs"

// path: https://nodejs.org/api/path.html
import path from "node:path"

// chalk: https://www.npmjs.com/package/chalk
import chalk from "chalk"

// cTable: https://www.npmjs.com/package/console.table
import cTable from "console.table"

// ImapFlow: https://imapflow.com/module-imapflow-ImapFlow.html
import { ImapFlow } from "imapflow"

// js-yaml: https://www.npmjs.com/package/js-yaml
import yaml from "js-yaml"

// lodash: https://lodash.com/docs/4.17.15
import _ from "lodash"

import pak from "../package.json" assert { type: "json" }

// ----------------------------------------------------------------------------
// Default values for the CLI
// ----------------------------------------------------------------------------
// TODO: align documented defaults, in .env.defau1lts with these values
export const dv = {
  pak: pak,
  config_path: path.resolve(
    path.normalize(process.env.MM_CONFIG_PATH || path.join(process.cwd(), "config"))
  ),
  accountAlias: process.env.MM_DEFAULT_ACCOUNT || "all",
  scanLimit: process.env.MM_SCAN_LIMIT || "12",
  openCommand: process.env.MM_OPEN_COMMAND || "outlook",
  rulesFolder: process.env.MM_RULES_FOLDER || "src/rules",
  rulesFile: process.env.MM_RULES_FILE || "common",
  rulesSet: process.env.MM_RULES_SET || "save"
}

// ----------------------------------------------------------------------------
// timestamp function that returns a string in the
// format of "YYYYmmdd HH:MM:SS:ms am/pm"
// ----------------------------------------------------------------------------
const ts = () => {
  const dt = new Date()
  const ms = dt.getMilliseconds().toString().padStart(3, "0")
  const ampm = dt.getHours() >= 12 ? "pm" : "am"
  const t = dt
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    })
    .replace(/(\d+):(\d+):(\d+)\s(am|pm)/i, "$1:$2:$3")

  return `${t}:${ms} ${ampm}`
}

// ----------------------------------------------------------------------------
// Instance variables
// ----------------------------------------------------------------------------
let loggerInstance = null
let optionsInstance = null

export function setInstance(iv) {
  const { args, options, logger } = iv
  loggerInstance = logger
  optionsInstance = options
  try {
    const config = load()
    const accounts = Object.keys(config)
    const activeAccounts = accounts.filter((account) => config[account].active)
    const inactiveAccounts = accounts.filter((account) => !config[account].active)
    verbose(`${accounts.length} accounts: [${accounts.join(", ")}]`)
    verbose(`${activeAccounts.length} active: [${activeAccounts.join(", ")}]`)
    verbose(`${inactiveAccounts.length} inactive: [${inactiveAccounts.join(", ")}]`)

    // if no account is specified then use the default account
    options.account = args?.account ? args.account : dv.accountAlias
    verbose(`args.account=${args?.account}`)
    verbose(`options.account=${options.account}`)

    if (isAccount("list")) {
      const tableData = []
      for (const account of Object.keys(config)) {
        if (!options.all && !config[account].active) continue

        tableData.push({
          index: config[account].index,
          account: account,
          // active: config[account].active,
          rules: config[account].rules.length,
          filters: config[account].filters.length
        })
      }
      info(`\n${cTable.getTable(tableData)}`)
      return null
    }
    return config
  } catch (err) {
    error(err)
  }
  return null
}

// ----------------------------------------------------------------------------
// info function
// ----------------------------------------------------------------------------
export function info(message) {
  if (!optionsInstance.quiet && !optionsInstance.brief) {
    ;(loggerInstance.info ?? console)(message)
  }
}

// ----------------------------------------------------------------------------
// error function
// ----------------------------------------------------------------------------
export function error(message) {
  if (!optionsInstance.quiet) {
    ;(loggerInstance.error ?? console)(chalk.red(message))
  }
}

// ----------------------------------------------------------------------------
// verbose function
// ----------------------------------------------------------------------------
export function verbose(message) {
  if (!optionsInstance.quiet && optionsInstance.verbose) {
    ;(loggerInstance.info ?? console)(`${ts()} ${chalk.blue(message)}`)
  }
}

// ----------------------------------------------------------------------------
// brief function
// ----------------------------------------------------------------------------
export function brief(message) {
  if (optionsInstance.brief) {
    ;(loggerInstance.info ?? console)(`${ts()} ${chalk.magenta(message)}`)
  }
}

// ----------------------------------------------------------------------------
// isAccount function
// ----------------------------------------------------------------------------
export function isAccount(value2check = "all") {
  return optionsInstance?.account === value2check
}

// ----------------------------------------------------------------------------
// isAccountAll function
// ----------------------------------------------------------------------------
export function isAccountAll() {
  return optionsInstance.account === "all" || optionsInstance.account === "0"
}

// ----------------------------------------------------------------------------
// Gets an ImapFlow Instance
// ----------------------------------------------------------------------------
export function getImapFlow(account, nologger) {
  return new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.tls !== false,
    auth: { user: account.user, pass: decrypt(account.password, false) },
    logger: nologger ? false : optionsInstance.verbose ? loggerInstance : false
  })
}

// -------------------------------------------------------------------------------
// Retrieves an account from the provided configuration based on the given alias.
// -------------------------------------------------------------------------------
export function getAccount(config, alias) {
  if (typeof alias === "boolean" || alias === undefined) {
    return undefined
  }
  if (typeof alias === "string" && alias.length > 0) {
    if (config[alias]) return config[alias]
  }
  const accno = Number.parseInt(alias)
  if (Number.isNaN(accno) || accno.toString() !== alias) {
    return undefined
  }
  return config[Object.keys(config).find((account) => config[account].index === accno)]
}

// ------------------------------------------------------------------------
// load config
// ------------------------------------------------------------------------
export const load = (cFile) => {
  // return an object whose keys are the config name and the values are the config object
  let config = {}

  // validate the config directory exists
  if (!fs.existsSync(dv.config_path)) {
    error(`config directory not found: ${dv.config_path}`)
    return config
  }

  // if cFile is falsy or all, we are asking for the all the configs
  // to get the config names use config.keys()
  if (!cFile || cFile === "all") {
    verbose("loading config list")
    const files = fs.readdirSync(dv.config_path)
    for (const file of files) {
      const ext = path.extname(file)
      if (ext === ".yml" || ext === ".yaml") {
        const name = path.basename(file, ext)
        config = Object.assign(config, load(name))
      }
    }
    return config
  }

  // if cFile is provided then we are asking for a specific config
  const configFile = path.join(dv.config_path, `${cFile}.yml`)

  if (!fs.existsSync(configFile)) {
    error(`config file not found: ${configFile}`)
    return config
  }

  // load the config file
  try {
    config[cFile] = yaml.load(fs.readFileSync(configFile, "utf8"))
  } catch (err) {
    error(err)
  }
  return config
}

// ------------------------------------------------------------------------
// save config
// ------------------------------------------------------------------------
export const save = (cFile, config) => {
  // validate the config directory exists
  if (!fs.existsSync(dv.config_path)) {
    error(`config directory not found: ${dv.config_path}`)
    return
  }
  // if cFile is provided then we are asking for a specific config
  const configFile = path.join(dv.config_path, `${cFile}.yml`)
  verbose(`validating config: ${configFile}`)

  if (!fs.existsSync(configFile)) {
    error(`config file not found: ${configFile}`)
    return
  }

  // save the file
  try {
    fs.writeFileSync(configFile, yaml.dump(config))
  } catch (err) {
    error(err)
  }
  return config
}

// ------------------------------------------------------------------------
// getFolderPath
// ------------------------------------------------------------------------
export async function getFolderPath(client, name) {
  if (name?.toLowerCase() === "inbox") {
    return "INBOX"
  }
  const folders = await client.list()
  const folder = _.find(folders, (f) => f.name === name)?.path

  if (name === "Archive") {
    return folder ?? "[Gmail]/All Mail"
  }
  return folder ?? _.find(folders, (f) => f.path === name)?.path
}

// ------------------------------------------------------------------------
// getcrypt
// ------------------------------------------------------------------------
export const getcrypt = (preseed) => {
  const separator = "::"
  const seed =
    preseed !== undefined && typeof preseed === "string" ? preseed : process.env.MM_CRYPTOKEY
  if (!seed) throw new Error("No seed provided")
  const key = crypto.createHash("sha256").update(seed).digest("hex").slice(16, 48)
  return { key, separator }
}

// ------------------------------------------------------------------------
// Encrypts a string using AES-256-CBC encryption
// ------------------------------------------------------------------------
export const encrypt = (string, preseed) => {
  const { key, separator } = getcrypt(preseed)
  try {
    const rando = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv("aes-256-cbc", key, rando)
    let encryptedString = cipher.update(string)
    encryptedString = Buffer.concat([encryptedString, cipher.final()])
    return rando.toString("hex") + separator + encryptedString.toString("hex")
  } catch (e) {
    throw new Error(`Encryption failed: ${e.message}\n`)
  }
}

// ------------------------------------------------------------------------
// Decrypts an AES-256-CBC encrypted string
// ------------------------------------------------------------------------
export const decrypt = (string, preseed) => {
  const { key, separator } = getcrypt(preseed)
  try {
    const split = string.split(separator)
    const iv = Buffer.from(split[0], "hex")
    split.shift()
    const encryptedText = Buffer.from(split.join(separator), "hex")
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  } catch (e) {
    throw new Error(`Decryption failed: ${e.message}\n`)
  }
}

// ----------------------------------------------------------------------------
// Exports
// ----------------------------------------------------------------------------
export default {
  dv,
  setInstance,
  info,
  error,
  verbose,
  brief,
  isAccount,
  isAccountAll,
  load,
  save,
  getFolderPath,
  encrypt,
  decrypt
}
