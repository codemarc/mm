import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import chalkPipe from "chalk-pipe"
import { ImapFlow } from "imapflow"
import yaml from "js-yaml"
import pak from "../package.json" assert { type: "json" }

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

// =============================================================================
// util class
//
// The `util` class provides utility functions and properties
// for the application.`
// =============================================================================
export default class util {
  constructor(iv) {
    if (util.instance) {
      this.setInstance(iv)
      // biome-ignore lint/correctness/noConstructorReturn: <explanation>
      return util.instance
    }

    this.dv = {
      config_path: path.resolve(
        path.normalize(process.env.MM_CONFIG_PATH || path.join(process.cwd()))
      ),
      openCommand: process.env.MM_OPEN_COMMAND || "outlook",
      scanLimit: process.env.MM_SCAN_LIMIT || "5",
      rulesFolder: path.resolve(
        path.normalize(process.env.MM_RULES_FOLDER || path.join(process.cwd(), "rules"))
      ),
      dataFolder: path.resolve(
        path.normalize(process.env.MM_DATA_FOLDER || path.join(process.cwd(), "data"))
      ),
      rulesFile: process.env.MM_RULES_FILE || "common",
      rulesSet: process.env.MM_RULES_SET || "save"
    }

    this.cpbrief = chalkPipe("magenta")
    this.cpverbose = chalkPipe("blue")
    this.cperror = chalkPipe("red")

    this.pak = pak

    this.setInstance(iv)

    this.config = this.load()
    util.instance = this
  }

  setInstance(iv) {
    if (iv?.args) util.instance.args = iv.args
    if (iv?.options) util.instance.options = iv.options
    if (iv?.logger) util.instance.logger = iv.logger
    return this.config
  }

  getLogger() {
    return this.logger
  }

  getArgs() {
    return this.args
  }

  getOptions() {
    return this.options
  }

  getPak() {
    return this.pak
  }

  getDefaults() {
    return this.dv
  }

  info(message) {
    if (this.options.quiet || this.options.brief) {
      return
    }
    if (this.logger) this.logger.info(message)
    else console.log(message)
  }

  error(message) {
    if (!this.options?.quiet) {
      if (this.logger) this.logger.error(this.cperror(message))
      else console.error(this.cperror(message))
    }
  }

  verbose(message) {
    if (!this.options?.quiet && this.options?.verbose) {
      const msg = `${ts()} ${this.cpverbose(message)}`
      if (this.logger) this.logger.info(msg)
      else console.log(msg)
    }
  }

  brief(message) {
    if (!this.options?.quiet && this.options?.brief) {
      const msg = `${ts()} ${this.cpbrief(message)}`
      if (this.logger) this.logger.info(msg)
      else console.log(msg)
    }
  }

  green(message) {
    const clr = chalkPipe("green")
    return message === undefined ? clr("-".repeat(63)) : clr(message)
  }

  red(message) {
    const clr = chalkPipe("red")
    return message === undefined ? clr("-".repeat(63)) : clr.red(message)
  }

  getImapFlow(account, nologger) {
    return new ImapFlow({
      host: account.host,
      port: account.port,
      secure: account.tls !== false,
      auth: { user: account.user, pass: this.decrypt(account.password, false) },
      logger: nologger ? false : this.options.verbose ? this.logger : false
    })
  }

  getAccount = (config, key) => {
    this.verbose(`finding account ${key}`)
    let acct = config.accounts.find((a) => a.account === key)
    if (!acct) {
      const index = Number.parseInt(key)
      if (!Number.isNaN(index)) {
        this.verbose("trying index")
        acct = config.accounts.find((a) => a.index === index)
      }
      if (!acct) {
        this.error("account not found")
        return null
      }
    }
    this.verbose(`${acct.account} found`)
    return acct
  }

  // ------------------------------------------------------------------------
  // loadRules
  // ------------------------------------------------------------------------
  loadRules = async (ruleset) => {
    const rulesFile = path.join(this.dv.rulesFolder, `${ruleset.file ?? this.dv.rulesFile}.js`)

    this.verbose(this.green())
    this.verbose(this.green(`ruleset: ${ruleset.set} - ${ruleset.desc ?? ""}`))
    this.verbose(this.green(`   file: ${rulesFile}`))
    this.verbose(this.green())

    // validate the config directory exists
    if (!fs.existsSync(this.dv.rulesFolder)) {
      this.error(`rules folder not found: ${this.dv.rulesFolder}`)
      return null
    }

    if (!fs.existsSync(rulesFile)) {
      this.error(`rules file not found: ${rulesFile}`)
      return null
    }

    // load the rules file
    try {
      return await import(rulesFile)
    } catch (err) {
      if (this.options.verbose) this.verbose(this.red(err.stack))
      else this.error(err)
    }
    return null
  }

  // ------------------------------------------------------------------------
  // loadRuleSets
  // ------------------------------------------------------------------------
  loadRuleSets = () => {
    let rulesets = {}

    // validate the config directory exists
    if (!fs.existsSync(this.dv.rulesFolder)) {
      this.error(`rules folder not found: ${this.dv.rulesFolder}`)
      return rulesets
    }

    const rulesFile = path.join(this.dv.rulesFolder, `${this.dv.rulesFile}.rules`)
    this.verbose(`from ${rulesFile}`)

    if (!fs.existsSync(rulesFile)) {
      this.error(`rules file not found: ${rulesFile}`)
      return rulesets
    }

    // load the rules file
    try {
      rulesets = yaml.load(fs.readFileSync(rulesFile, "utf8"))
    } catch (err) {
      this.error(err)
    }
    return rulesets
  }

  // ------------------------------------------------------------------------
  // load
  // ------------------------------------------------------------------------
  load = () => {
    let config = {}

    // validate the config directory exists
    if (!fs.existsSync(this.dv.config_path)) {
      this.error(`config directory not found: ${this.dv.config_path}`)
      return config
    }

    const configFile = path.join(this.dv.config_path, "config.yml")
    this.verbose(`config file: ${configFile}`)

    if (!fs.existsSync(configFile)) {
      this.error(`config file not found: ${configFile}`)
      return config
    }

    // load the config file
    try {
      config = yaml.load(fs.readFileSync(configFile, "utf8"))
    } catch (err) {
      this.error(err)
    }
    return config
  }

  // ------------------------------------------------------------------------
  // save
  // ------------------------------------------------------------------------
  save = (config) => {
    // validate the config directory exists
    if (!fs.existsSync(this.dv.config_path)) {
      this.error(`config directory not found: ${this.dv.config_path}`)
      return config
    }

    const configFile = path.join(this.dv.config_path, "config.yml")
    this.verbose(`config file: ${configFile}`)

    // save the file
    try {
      fs.writeFileSync(configFile, yaml.dump(config))
    } catch (err) {
      this.error(err)
    }
    return config
  }

  // ------------------------------------------------------------------------
  // getFolderPath
  // ------------------------------------------------------------------------
  getFolderPath = async (client, name) => {
    if (name?.toLowerCase() === "inbox") {
      return "INBOX"
    }
    const folders = await client.list()
    const folder = folders.find((f) => f.name === name)?.path

    if (name === "Archive") {
      return folder ?? "[Gmail]/All Mail"
    }
    return folder ?? folders.find((f) => f.path === name)?.path
  }

  // ------------------------------------------------------------------------
  // getcrypt
  // ------------------------------------------------------------------------
  getcrypt = (preseed) => {
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
  encrypt = (string, preseed) => {
    const { key, separator } = this.getcrypt(preseed)
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
  decrypt = (string, preseed) => {
    const { key, separator } = this.getcrypt(preseed)
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
}
