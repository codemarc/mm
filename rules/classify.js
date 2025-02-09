import { getMessageImportance, getMessageDisposition } from "./classifiers.js"

// ----------------------------------------------------------------------------
// classify rule
// ----------------------------------------------------------------------------
export async function classify(msglist, ...args) {
  if (msglist.length === 0) return msglist
  const [acct, options, client, ruleset, rule] = args

  // Update or add category, disposition, and lineage for each message
  return msglist.map((msg) => {
    const [category, catcalc] = getMessageImportance(msg, acct)
    const [disposition, dispcalc] = getMessageDisposition(msg, category)
    return {
      ...msg,
      category,
      disposition,
      lineage: {
        catcalc,
        dispcalc
      }
    }
  })
}
