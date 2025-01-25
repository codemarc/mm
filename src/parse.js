import { simpleParser } from "mailparser"

// ----------------------------------------------------------------------------
// round the date to the nearest minute
// ----------------------------------------------------------------------------
const roundToMinutes = (date) => {
  const d = new Date(date)
  return Number.isNaN(d.getTime())
    ? undefined
    : new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes())
}

// ----------------------------------------------------------------------------
// parse
// ----------------------------------------------------------------------------
export async function parsem(msglist, ...args) {
  if (msglist.length === 0) return msglist
  if (msglist[0].source === undefined) return msglist
  const [acct, options, client, ruleset, rule] = args

  // parse the message
  const scanlist = msglist.reverse()
  const answerset = []
  let ndx = 1
  for (const msg of scanlist) {
    const parsed = await simpleParser(msg.source)
    const newmsg = {
      index: ndx++,
      seq: msg.seq,
      senderEmail: parsed.from?.value?.[0]?.address?.toLowerCase(),
      recipientEmail: parsed.to?.value?.[0]?.address?.toLowerCase(),
      from: parsed.from?.text || "(unknown sender)",
      to: parsed.to?.text || "(unknown recipient)",
      subject: parsed.subject || "(no subject)",
      text: parsed.text
        ?.trim()
        .slice(0, 1024)
        .split("\n")
        .filter((line) => line.trim() !== "")
        .slice(0, 10),
      date: roundToMinutes(parsed.date) || "(no date)"
    }
    answerset.push(newmsg)
  }
  return answerset
}
