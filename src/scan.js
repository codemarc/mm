import chalk from "chalk"
import _ from "lodash"
import { simpleParser } from "mailparser"
import { load } from "./smash.js"
import { brief, dv, error, info, setInstance, verbose } from "./util.js"
import { getFolderPath, refreshFilters, roundToMinutes } from "./util.js"
import { getAccount, getImapFlow, isAccountAll } from "./util.js"

/**
 * Fetches and parses specified messages from the given IMAP client.
 *
 * @async
 * @function fetchMessages
 * @param {Object} client - IMAP client instance for fetching email messages.
 * @param {number[]} messagesToFetch - List of message sequence identifiers.
 * @returns {Promise<Object[]>} A promise resolving to an array of message objects, each containing:
 *  @property {number} seq - The sequence number of the message.
 *  @property {string} senderEmail - Lowercased sender email address.
 *  @property {string} recipientEmail - Lowercased recipient email address.
 *  @property {string} from - Text representation of the sender.
 *  @property {string} to - Text representation of the recipient.
 *  @property {string} subject - Subject of the message.
 *  @property {string} date - Date of the message, rounded to minutes.
 */
const fetchMessages = async (client, messagesToFetch) => {
  const msglist = []
  for (const seq of messagesToFetch) {
    const message = await client.fetchOne(seq, { source: true })
    const parsed = await simpleParser(message.source)
    const msg = {
      seq: seq,
      senderEmail: parsed.from?.value?.[0]?.address?.toLowerCase(),
      recipientEmail: parsed.to?.value?.[0]?.address?.toLowerCase(),
      from: parsed.from?.text || "(unknown sender)",
      to: parsed.to?.text || "(unknown recipient)",
      subject: parsed.subject || "(no subject)",
      date: roundToMinutes(parsed.date) || "(no date)"
    }
    msglist.push(msg)
  }
  return msglist
}

async function scanMailbox2(account, options) {
  const client = await getImapFlow(account)
  try {
    await client.connect()
    const opt = options.folder && typeof options.folder === "string" ? options.folder : "INBOX"
    const src = await getFolderPath(client, opt)

    const lock = await client.getMailboxLock(src)
    try {
      const allMessages = await client.search({ all: true })
      const unreadMessages = await client.search({ unseen: true })
      const limit = Number.parseInt(options.limit || dv.scanLimit)
      const skip = Number.parseInt(options.skip || "0")
      const messages = options.unread ? unreadMessages : allMessages
      const messagesToFetch = messages.slice(-limit - skip, -skip || undefined).reverse()
      const msglist = await fetchMessages(client, messagesToFetch)
      const filterCounts = new Map()
      let ndx = 0

      if (account.filters !== undefined && account.filters.length > 0) {
        for (const filter of account.filters) {
          if (!filter.includes(":")) continue
          const filterName = filter.split(":")[0]
          const filterTexts = account[filterName].map((text) => text.toLowerCase())

          const matches = msglist.filter((msg) => {
            return filterTexts.some((text) => {
              if (text.length === 0) return false
              const isDomain = !text.includes("@")
              return (
                msg.senderEmail === text ||
                msg.recipientEmail === text ||
                (isDomain && (msg.senderEmail.endsWith(text) || msg.recipientEmail.endsWith(text)))
              )
            })
          })

          if (matches.length > 0) {
            // Move matching messages to filter folder
            for (const msg of matches) {
              if (msg.filter === undefined) {
                msg.filter = filterName
                await client.messageMove(msg.seq, filterName)
              }
            }
            filterCounts.set(filterName, matches.length)
          }
        }
      }

      for (const msg of msglist) {
        if (options.read) {
          await client.messageFlagsAdd(msg.seq, ["\\Seen"])
        }

        const seqString =
          chalk.blue(`Index: ${++ndx}, Seqno: ${msg.seq}`) +
          (msg.filter ? chalk.red(` ${msg.filter}`) : "")

        info(seqString)
        info(`From: ${msg.from}`)
        info(`To: ${msg.to}`)
        info(`Subject: ${msg.subject}`)
        info(`Date: ${msg.date}`)
        info("\n")
      }

      info(
        chalk.blue(
          `Account: ${account.account} total(${allMessages.length.toLocaleString()}) unread(${unreadMessages.length.toLocaleString()}) limit(${messagesToFetch.length.toLocaleString()}) skipped(${skip.toLocaleString()})`
        )
      )
      filterCounts.forEach((count, folder) => {
        info(chalk.green(`Moved ${count} messages to ${folder}`))
      })

      info("\n")
    } finally {
      lock.release()
    }
  } catch (err) {
    error(`Error scanning account ${account.account}:`, err.message)
  } finally {
    await client.logout()
  }
}

/**
 * Main command handler for scanning email accounts and messages
 * Processes email scanning based on provided arguments and options
 */
export async function scanCommand(args, options, logger) {
  setInstance({ options: options, logger: logger })

  try {
    verbose("loading config")
    const config = load()

    const limit = Number.parseInt(args.limit || options.limit || dv.scanLimit)
    options.limit = limit.toString()

    const skip = Number.parseInt(options.skip || "0")

    // if no account is specified then use the default account
    options.account = args?.account ? args.account : dv.accountAlias

    verbose(`account: ${options.account}`)

    // if the account is all
    if (isAccountAll()) {
      for (const account of config.accounts) {
        const label = `${account.index}: ${account.account}`
        info("\n\n------------------------------------------------")
        options.brief ? brief(label) : info(label)
        info("------------------------------------------------")

        await refreshFilters(account)
        if (account.filters.length > 1) {
          await scanMailbox2(account, options)
        } else {
          const blacklist = account.blacklist ?? []
          await scanMailbox(logger, account, limit, blacklist, skip, options)
        }
      }
      return
    }

    // otherwise show the counts for the account
    const account = getAccount(config, options.account)

    if (!account) {
      error("account not found")
      return
    }

    await refreshFilters(account)
    //if (account.filters.length > 1) {
    if (1) {
      await scanMailbox2(account, options)
    } else {
      const blacklist = account.blacklist ?? []
      await scanMailbox(logger, account, limit, blacklist, skip, options)
      return
    }
  } catch (err) {
    error(err)
  }
}

/**
 * Scans a single mailbox for messages matching specified criteria
 * Handles message fetching, parsing, blacklist checking, and message actions
 *
 * @returns {Promise<void>} A promise that resolves when mailbox scanning is complete
 * @throws {Error} If mailbox scanning encounters an error
 */
async function scanMailbox(logger, account, limit, blacklist, skip, options) {
  const qar = []
  const client = await getImapFlow(account)

  try {
    // Connect to server
    await client.connect()

    const folder = await getFolderPath(
      client,
      options.folder && typeof options.folder === "string" ? options.folder : "INBOX"
    )

    let blacklistedMessageCount = 0

    const lock = await client.getMailboxLock(folder)
    try {
      if (options.zero) {
        const unread = await client.search({ unseen: true })
        if (unread.length > 0) {
          await client.messageFlagsAdd(unread, ["\\Seen"])
          info(chalk.green(`Marked ${unread.length} messages as read`))
        } else {
          info("No unread messages found")
        }
      } else {
        // Modify search to include unread filter if specified
        const searchCriteria = options.unread ? { unseen: true } : { all: true }
        const messages = await client.search(searchCriteria)
        const messagesToFetch = messages.slice(-limit - skip, -skip || undefined).reverse()

        info(
          `Found ${messages.length} ${options.unread ? "unread " : ""} messages, showing ${messagesToFetch.length} (skipping ${skip})\n`
        )

        // Fetch messages
        let ndx = 0
        for (const seq of messagesToFetch) {
          const message = await client.fetchOne(seq, { source: true })
          const parsed = await simpleParser(message.source)

          const senderEmail = parsed.from?.value?.[0]?.address?.toLowerCase()
          const recipientEmail = parsed.to?.value?.[0]?.address?.toLowerCase()
          const isBlacklisted = blacklist.some((blocked) => {
            if (blocked.length === 0) return false
            const blc = blocked.toLowerCase()
            return (
              blc === senderEmail ||
              blc === recipientEmail ||
              (blc.indexOf("@") === -1 && senderEmail.endsWith(blc))
            )
          })

          const seqString =
            chalk.blue(`Index: ${++ndx}, Seqno: ${seq}`) +
            (isBlacklisted ? chalk.red(" BLACKLISTED") : "")

          if (options.quiet) {
            qar.push(seq)
          } else {
            info(seqString)
            info(`From: ${parsed.from?.text || "(unknown sender)"}`)
            info(`To: ${parsed.to?.text || "(unknown recipient)"}`)
            info(`Subject: ${parsed.subject || "(no subject)"}`)
            info(`Date: ${roundToMinutes(parsed.date)}` || "(no date)")
            info("\n")
          }

          // Mark message as read
          if (options.read) {
            await client.messageFlagsAdd(seq, ["\\Seen"])
          }

          if (isBlacklisted) {
            blacklistedMessageCount++
            await client.messageMove(seq, "Blacklisted")
          }
        }
        brief(`Blacklisted ${blacklistedMessageCount} messages`)
      }
    } finally {
      // Always release the lock
      lock.release()
    }
    if (qar.length > 0) {
      info(`"${qar.join(",")}"`)
    }
  } catch (err) {
    error(`Error scanning account ${account.account}:`, err.message)
  } finally {
    await client.logout()
  }
}
