import fs from "node:fs"
import path from "node:path"
import util from "../src/util.js"
const u = new util()

/**
 * Saves message list to JSON file based on rule configuration
 * @param {Array} msglist - List of messages to save
 * @param {...any} args - [acct, options, client, ruleset, rule]
 * @returns {Promise<Array>} Original message list
 */
export async function save(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args
  if (msglist.length === 0) return msglist

  if (rule?.save) {
    if (rule.save.endsWith(".json")) {
      fs.writeFileSync(rule.save, JSON.stringify(msglist, null, 2))
      return msglist
    }

    const folder = u.dv.dataFolder
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true })
    }

    // save to data folder
    const filename = path.join(folder, `${acct.account}.${rule.save}.json`)
    fs.writeFileSync(filename, JSON.stringify(msglist, null, 2))
    return msglist
  }

  const filename = path.join(folder, `${acct.account}.${options.ruleset}.json`)
  fs.writeFileSync(filename, JSON.stringify(msglist, null, 2))
  return msglist
}

/**
 * Loads message list from JSON file based on rule configuration
 * @param {Array} msglist - Initial message list (used for error fallback)
 * @param {...any} args - [acct, options, client, ruleset, rule]
 * @returns {Promise<Array>} Loaded message list or original list if error
 */
export async function load(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args
  const filename = path.join(
    u.dv.dataFolder,
    `${acct.account}.${rule?.load ? rule.load : options.ruleset}.json`
  )

  if (!fs.existsSync(filename)) {
    u.error(`rule:load: file ${filename} is missing`)
    return msglist
  }

  return JSON.parse(fs.readFileSync(filename, "utf8"))
}
