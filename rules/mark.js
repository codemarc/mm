import util from "../src/util.js"
const u = new util()

/**
 * Applies IMAP flags to messages based on rule configuration
 * Handles flag additions for: read, star, delete, flag
 * Handles flag removals for: unread, unstar, unflag
 * @param {Array} msglist - List of messages to process
 * @param {...any} args - [acct, options, client, ruleset, rule]
 * @returns {Promise<Array>} Original message list
 */
export async function mark(msglist, ...args) {
  if (msglist.length === 0) return msglist
  const [acct, options, client, ruleset, rule] = args

  const marklist = msglist.map((msg) => msg.seq)
  if (marklist.length === 0) return msglist

  // Normalize and log flag configuration
  const flagslist = typeof rule?.mark === "string" ? [rule.mark] : (rule?.mark ?? ["read"])
  u.verbose(`rule:mark ${flagslist}`)

  // Configure flag mappings and operations
  const flagActions = {
    add: {
      read: "\\Seen",
      star: "\\Flagged",
      flag: "\\Flagged",
      delete: "\\Deleted"
    },
    remove: {
      unread: "\\Seen",
      unstar: "\\Flagged",
      unflag: "\\Flagged"
    }
  }

  // Process flags through defined actions
  const flagsToAdd = []
  const flagsToRemove = []

  for (const flag of flagslist) {
    if (flagActions.add[flag]) {
      flagsToAdd.push(flagActions.add[flag])
    } else if (flagActions.remove[flag]) {
      flagsToRemove.push(flagActions.remove[flag])
    }
  }

  // Execute IMAP flag operations
  if (flagsToAdd.length > 0) {
    await client.messageFlagsAdd(marklist, [...new Set(flagsToAdd)])
  }
  if (flagsToRemove.length > 0) {
    await client.messageFlagsRemove(marklist, [...new Set(flagsToRemove)])
  }

  return msglist
}
