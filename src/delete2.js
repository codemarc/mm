import chalk from "chalk"
import * as u from "./util.js"
const { dv, error, info, verbose } = u

// ----------------------------------------------------------------------------
// explain the delete command
// ----------------------------------------------------------------------------
export async function explain() {
  info(chalk.blueBright("\nThe Delete Command"))
  info(chalk.blueBright("--------------------"))
  info(`The delete command is used to manage email deletions for an account.
It can be used to delete specific emails by index or sequence number, 
or to move the contents of a folder to trash. You cannot delete all. If you
pass all as the account you will get a list of accounts.

  * If you pass the "index" option, you can specify the index(s) of emails to delete, 
    using a comma-separated list or a range with ':'.

  * If you pass the "seqno" option, you can specify the sequence number(s) of emails to delete,
    using a comma-separated list or a range with ':'.

  * If you pass the "-f" option, it will move the content of the specified folder to trash.

Examples
  mm delete 1 -s         // latest/last message
  mm delete 1 -s 2201    // message with seqno 2201
  mm delete 1 -s 28,29   // messages with seqno 28 and 29
  mm delete 1 -s 4:6     // messages with seqno 4, 5 and 6
  mm delete 1 -s 1:*     // all messages

  mm delete 1 -i
  mm delete 1 -i 2
  mm delete 1 -i 1,2,3
  mm delete 1 -i 1-3
  mm delete 1 -i 1:3
  mm delete 1 -i 1:3,5,7-9

Try mm delete --help for more information.
`)
}

/**
 * ----------------------------------------------------------------------------
 * delete command
 * ----------------------------------------------------------------------------
 */
export async function deleteCommand(args, options, logger) {
  const config = u.setInstance({ args, options, logger })
  try {
    if (config == null) return

    // if the account is all then throw an error
    // all is not supported for the delete command
    if (u.isAccountAll()) {
      args.account = "list"
      u.setInstance({ args, options, logger })
      return
    }

    // check for both if the empty option is set then cleanup the account
    if (options.index && options.seqno) {
      verbose(options)
      error("Cannot specify both index and seqno")
      return
    }

    // otherwise find the selected account
    verbose(`finding mailbox associated with ${options.account}`)
    const account = u.getAccount(config, options.account)
    if (!account) {
      error(`${options.account} not found`)
      return
    }
    verbose(`found ${account}/${config[account].account.user}`)

    // ultimately queue up the messages to be deleted by sequence number
    const seqnos = options.index ? expandIndexSelecton(options) : expandSeqnoSelecton(options)

    if (seqnos.length === 0) {
      error("No messages selected for deletion")
      return
    }

    const acct = config[account].account
    const client = u.getImapFlow(acct, true)
    client.on("expunge", (data) => {
      verbose(data)
    })

    try {
      verbose("connecting to imap server")
      await client.connect()
      await mv2trash(client, seqnos, { name: acct.name, user: acct.user, ...options })
    } finally {
      await client.close()
    }
  } catch (e) {
    error(e)
  }
}

// ----------------------------------------------------------------------------
// expands the sequence number selection into a list of sequence numbers
// ----------------------------------------------------------------------------
const expandSeqnoSelecton = (options) => {
  if (options.seqno) {
    verbose("delete selection by seqno")

    if (typeof options.seqno === "boolean") {
      options.seqno = "*" // the latest
    }
  }
  return options.seqno
}

// ----------------------------------------------------------------------------
// expands the index selection into a list of index numbers
// ----------------------------------------------------------------------------
const expandIndexSelecton = (options) => {
  let arIndex = []

  if (options.index) {
    verbose("delete selection by index")

    // start by examining the index
    if (typeof options.index === "boolean") {
      options.index = "1"
    }

    // Handle comma-separated list like 1,2,3
    const indexnos = options.index.split(",").map((s) => s.trim())

    arIndex = indexnos.flatMap((indexno) => {
      const match = indexno.match(/^(\d+)-(\d+)$/)
      if (match) {
        const start = Number.parseInt(match[1])
        const end = Number.parseInt(match[2])
        return Array.from({ length: end - start + 1 }, (v, k) => k + start)
      }
      const match2 = indexno.match(/^(\d+):(\d+)$/)
      if (match2) {
        const start = Number.parseInt(match2[1])
        const end = start + Number.parseInt(match2[2])
        return Array.from({ length: end - start }, (v, k) => k + start)
      }
      return [Number.parseInt(indexno)]
    })
  }
  return arIndex
}

// ----------------------------------------------------------------------------
// Moves messages from specified folder to trash
// ----------------------------------------------------------------------------
const mv2trash = async (client, seqnos, options) => {
  let folder = "INBOX"
  if (options.folder && typeof options.folder === "string") {
    folder = options.folder
  }
  const trash = await u.getFolderPath(client, "Trash")
  const src = await u.getFolderPath(client, folder)
  if (src === undefined) {
    error(`Folder ${folder} not found`)
    return
  }
  if (trash === undefined) {
    error("Trash folder is not available")
    return
  }
  info(`moving messages from ${src} to ${trash}`)
  const lock = await client.getMailboxLock(src)

  try {
    if (options.index) {
      info("index: true")

      const messages = (await client.search({ all: true }))?.reverse()
      info(`${options.name}: ${messages.length.toLocaleString()} messages in ${folder}`)

      const msglist = []
      for (let i = 0; i < seqnos.length; i++) {
        msglist.push(messages[seqnos[i] - 1])
      }
      verbose("messages for deletion")
      verbose(msglist)

      await client.messageMove(msglist, trash, { uid: false })
      info(chalk.green(`Moved ${msglist.length} messages to ${trash}`))
    } else {
      info("seqno: true")
      const messages = await client.search({ seq: seqnos })
      info(`${options.name}: ${messages.length.toLocaleString()} messages in ${folder}`)
      verbose("messages for deletion")
      verbose(messages)

      await client.messageFlagsAdd(messages, ["\\Deleted"])
      // await client.messageDelete(messages);
      await client.messageMove(messages, trash)
      info(chalk.green(`Deleted ${messages.length} messages to ${trash}`))
    }
  } finally {
    lock.release()
  }
}
