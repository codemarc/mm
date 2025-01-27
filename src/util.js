import path from "node:path"
import fs from "node:fs"
import crypto from "node:crypto"
import yaml from "js-yaml"
import chalkPipe from "chalk-pipe"
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
      openCommand: process.env.MM_OPEN_COMMAND || "outlook"
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
      const msg = `${this.cpbrief(message)}`
      if (this.logger) this.logger.info(msg)
      else console.log(msg)
    }
  }

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
