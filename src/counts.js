import cTable from "console.table"
import util from "./util.js"
const u = new util()

// ------------------------------------------------------------------------
// get the stats for an account
// ------------------------------------------------------------------------
export const getMessageStats = async (account) => {
  let rc = {}

  const client = u.getImapFlow(account, true)
  try {
    await client.connect()

    const folder = "INBOX"
    const src = await u.getFolderPath(client, folder)
    if (src === undefined) {
      error(`Folder ${account.account} ${folder} not found`)
      return rc
    }

    u.verbose(`gathering stats for ${account.account} ${src}`)
    const lock = await client.getMailboxLock(src)

    try {
      const status = await client.status(src, {
        messages: true,
        recent: true,
        unseen: true,
        highestModseq: true
      })
      const { messages, unseen, highestModseq } = status
      rc = {
        index: account.index,
        account: account.account,
        //status: acct.active === false ? "inactive" : "active",
        username: account.user,
        //folder: src,
        unread: unseen.toLocaleString(),
        total: messages.toLocaleString(),
        hwm: highestModseq.toLocaleString()
      }
      u.brief(`  ${account.account} ${unseen.toLocaleString()} of ${messages.toLocaleString()}`)
    } catch (error) {
      u.error(`${account.account} ${error}`)
    } finally {
      lock.release()
    }
    return rc
  } catch (err) {
    u.error(`${account.account} ${err?.responseText ?? err}`)
  } finally {
    await client.logout()
  }
}

// ------------------------------------------------------------------------
// display the message counts for all accounts
// ------------------------------------------------------------------------
export const displayMessageCounts = async (config, options) => {
  const msglist = []
  for (const acct of config.accounts) {
    if (acct.active || options.all) {
      const rc = await getMessageStats(acct)
      if (rc !== undefined) msglist.push(await getMessageStats(acct))
    }
  }
  u.info(`\n${cTable.getTable(msglist)}`)
}
