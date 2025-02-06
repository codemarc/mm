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
  const review = await u.getFolderPath(client, "Review")

  if (trash === undefined) {
    u.error("Trash folder is not available")
    return msglist
  }
  if (src === undefined) {
    u.error(`Folder ${folder} not found`)
    return msglist
  }

  // handle deleted messages
  const handleDeleted = async (msglist) => {
    const deleteList = msglist.filter((msg) => msg.disposition === dispositions.DELETE)
    if (deleteList.length === 0) {
      u.verbose("no messages to delete")
      return msglist
    }
    const deleteSeqList = deleteList.map((msg) => msg.seq)
    u.verbose(`moving messages from ${src} to ${trash}`)
    try {
      u.verbose("messages for deletion")
      u.verbose(deleteSeqList)
      await client.messageFlagsAdd(deleteSeqList, ["\\Deleted"])
      await client.messageMove(deleteSeqList, trash, { uid: false })
      u.verbose(`Moved ${deleteSeqList.length} messages to ${trash}`)

      // remove the deleted messaged from the msglist
      return msglist.filter((msg) => !deleteSeqList.includes(msg.seq))
    } catch (err) {
      u.verbose(`select error: ${err.message}`)
      if (options.verbose) u.verbose(err.stack)
      return msglist
    }
  }

  // handle file messages
  const handleFiled = async (msglist) => {
    const fileList = msglist.filter((msg) => msg.disposition === dispositions.FILE)
    if (fileList.length === 0) {
      u.verbose("no messages to file")
      return msglist
    }

    const filedSeqList = fileList.map((msg) => msg.seq)
    u.verbose(`moving messages from ${src} to ${review}`)
    try {
      await client.messageMove(filedSeqList, review, { uid: false })
      u.verbose(`Moved ${filedSeqList.length} messages to ${review}`)

      // remove the filed messaged from the msglist
      return msglist.filter((msg) => !filedSeqList.includes(msg.seq))
    } catch (err) {
      u.verbose(`select error: ${err.message}`)
      if (options.verbose) u.verbose(err.stack)
      return msglist
    }
  }

  // run the disposition logic
  const lock = await client.getMailboxLock(src)
  try {
    const deleted = await handleDeleted(msglist)
    const filed = await handleFiled(deleted)
    return filed
  } finally {
    lock.release()
  }
}
