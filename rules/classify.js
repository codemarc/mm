import { getMessageImportance, getMessageDisposition } from "./classifiers.js"

// ----------------------------------------------------------------------------
// classify rule
// ----------------------------------------------------------------------------
export async function classify(msglist, ...args) {
  if (msglist.length === 0) return msglist
  const [acct, options, client, ruleset, rule] = args

  // Update or add category and disposition for each message
  return msglist.map((msg) => {
    const category = getMessageImportance(msg, acct)
    return {
      ...msg,
      category,
      disposition: getMessageDisposition(msg, category)
    }
  })
}
