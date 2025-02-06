import fetch from "../src/fetch.js"
import parsem from "../src/parse.js"
import util from "../src/util.js"
const u = new util()

/**
 * Selects and processes messages based on rule criteria
 * @param {Array} msglist - Initial list of messages (unused in current implementation)
 * @param {...any} args - Rule arguments: [acct, options, client, ruleset, rule]
 * @returns {Promise<Array>} Processed message set
 */
export async function select(msglist, ...args) {
  const [acct, options, client, ruleset, rule] = args
  const picklist = [].concat(rule?.pick || []).filter(Boolean)
  u.verbose(`rule:select: ${picklist.join(", ")}`)

  // Configure fetch options based on picklist
  const fetchOptions = {
    ...options,
    unread: picklist.includes("unread"),
    tagged: picklist.includes("tagged")
  }

  try {
    // Fetch and process messages
    const msgs = await fetch(client, fetchOptions)
    if (!msgs?.length) return []

    // Parse and return processed messages
    return await parsem(msgs)
  } catch (err) {
    u.verbose(`select error: ${err.message}`)
    if (options.verbose) u.verbose(err.stack)
    return []
  }
}
