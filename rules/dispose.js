import { dispositions } from "./constants.js"
import util from "../src/util.js"
const u = new util()

// ----------------------------------------------------------------------------
// dispose rule
// ----------------------------------------------------------------------------
export async function dispose(msglist, ...args) {
  if (msglist.length === 0) return msglist
  const [acct, options, client, ruleset, rule] = args

  const folder = options.folder && typeof options.folder === "string" ? options.folder : "INBOX"
  const trash = await u.getFolderPath(client, "Trash")
  const src = await u.getFolderPath(client, folder)
  const review = await u.getFolderPath(client, "INBOX/_mm/Review")
  const track = await u.getFolderPath(client, "INBOX/_mm/Track")
  const later = await u.getFolderPath(client, "INBOX/_mm/Later")
  const schedule = await u.getFolderPath(client, "INBOX/_mm/Schedule")
  const urgent = await u.getFolderPath(client, "INBOX/_mm/Now")

  if (trash === undefined) {
    u.error("Trash folder is not available")
    return msglist
  }
  if (src === undefined) {
    u.error(`Folder ${folder} not found`)
    return msglist
  }

  const handle = async (msglist, dispose, src, dst) => {
    const list = msglist.filter((msg) => msg.disposition === dispose)
    if (list.length === 0) {
      u.verbose(`no messages to ${dispose}`)
      return msglist
    }
    const seqList = list.map((msg) => msg.seq)
    u.verbose(`moving messages from ${src} to ${dst}`)
    try {
      await client.messageMove(seqList, dst, { uid: false })
      u.verbose(`Moved ${seqList.length} messages to ${dst}`)

      // remove the handled messaged from the msglist
      return msglist.filter((msg) => !seqList.includes(msg.seq))
    } catch (err) {
      u.verbose(`select error: ${err.message}`)
      if (options.verbose) u.verbose(err.stack)
      return msglist
    }
  }

  // run the disposition logic
  const lock = await client.getMailboxLock(src)
  try {
    const deleted = await handle(msglist, dispositions.DELETE, src, trash)
    const tracked = await handle(deleted, dispositions.TRACK, src, track)
    const filed = await handle(tracked, dispositions.FILE, src, review)
    const scheduled = await handle(filed, dispositions.SCHEDULE, src, schedule)
    const needed = await handle(scheduled, dispositions.REPLY_NEEDED, src, urgent)
    const msgs = await handle(needed, dispositions.READ_LATER, src, later)
    return msgs
  } finally {
    lock.release()
  }
}
