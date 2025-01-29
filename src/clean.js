import util from "./util.js"
const u = new util()

// =============================================================================
// clean command
//
// The clean command clears the unread flag in the archive folder
// then it empties the drafts, spam and trash folders
//
// Use mm clean --help for more information.
//
// =============================================================================
export async function cleanCommand(args, options, logger) {
  const config = u.setInstance({ args, options, logger })

  try {
    if (config == null) return

    // an account name or index was passed and it was not all
    if (args.account !== "all") {
      const acct = u.getAccount(config, args.account)
      if (!acct) return

      // if the all option is not set then skip inactive accounts
      if (!acct.active && !options.all) {
        u.verbose(`\nskipping ${acct.account} (inactive)`)
        return
      }
      // clean the account
      u.verbose(`cleaning ${acct.account}/${acct.user}`)
      await cleanup(acct)
      return
    }

    // otherwise loop over all accounts
    for (const acct of config.accounts) {
      if (!acct.active && !options.all) {
        u.verbose(`\nskipping ${acct.account} (inactive)`)
        continue
      }
      u.verbose(`cleaning ${acct.account}/${acct.user}`)
      await cleanup(acct)
    }
  } catch (err) {
    if (options.verbose) u.verbose(err.stack)
    else u.error(err)
  }
}

// ----------------------------------------------------------------------------
// Helper function to get folder path and acquire mailbox lock
// ----------------------------------------------------------------------------
const getFolderAndLock = async (client, folder, op = "processing") => {
  const targ = await u.getFolderPath(client, folder)
  u.info(`${op} ${folder} from ${targ}`.toLowerCase())
  return await client.getMailboxLock(targ)
}

// ----------------------------------------------------------------------------
// Marks all unread messages in specified folder as read
// ----------------------------------------------------------------------------
const clear = async (client, folder) => {
  const lock = await getFolderAndLock(client, folder, "clearing")
  const fold = folder.toLowerCase()
  try {
    const messages = await client.search({ unseen: true })
    if (messages.length > 0) {
      await client.messageFlagsAdd(messages, ["\\Seen"])
      u.info(`marked ${messages.length} messages as read in ${fold}`)
    } else {
      u.info(`all messages have been marked as read in ${fold}`)
    }
  } finally {
    lock.release()
  }
}

// ----------------------------------------------------------------------------
// Permanently deletes all messages from specified folder
// ----------------------------------------------------------------------------
const empty = async (client, folder) => {
  const lock = await getFolderAndLock(client, folder, "emptying")
  const fold = folder.toLowerCase()
  try {
    const messages = await client.search({ all: true })
    if (messages.length > 0) {
      await client.messageDelete(messages)
      u.info(`emptied ${fold} - ${messages.length} messages`)
    } else {
      u.info(`${fold} is already empty`)
    }
  } finally {
    lock.release()
  }
}

// ----------------------------------------------------------------------------
// cleanup
// ----------------------------------------------------------------------------
const cleanup = async (account) => {
  const name = account.account
  const client = u.getImapFlow(account, true)
  // client.on("expunge", (data) => {
  //   u.verbose(data)
  // })

  try {
    u.verbose("connecting to imap server")
    await client.connect()
    await Promise.all([
      clear(client, "Archive"),
      empty(client, "Trash"),
      empty(client, "Spam"),
      empty(client, "Drafts")
    ])
  } finally {
    await client.close()
  }
}
