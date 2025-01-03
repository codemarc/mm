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

/**
 * Scans the mailbox for the given account and options.
 *
 */
async function scanMailbox(account, options, logger) {
  const client = await getImapFlow(account)
  try {
    await client.connect()
    const opt = options.folder && typeof options.folder === "string" ? options.folder : "INBOX"
    const src = await getFolderPath(client, opt)

    const lock = await client.getMailboxLock(src)
    try {
      const limit = Number.parseInt(options.limit || dv.scanLimit)
      const skip = Number.parseInt(options.skip || "0")

      // Extract flagged messages
      if (options.extract) {
        const flaggedMessages = await client.search({ flagged: true })
        const messagesToFetch = flaggedMessages.slice(-limit - skip, -skip || undefined).reverse()
        const msglist = await fetchMessages(client, messagesToFetch)
        for (const msg of msglist) {
          // must use logger directly to handle the quiet option
          if (options.quiet) {
            if (msg.from.startsWith('"')) {
              const addr = msg.from.split("<")[1].replace(/>/g, "")
              logger.info(addr)
            } else {
              logger.info(`${msg.from}`)
            }
          } else {
            info(`${msg.seq} ${msg.from}`)
          }
        }
        return
      }

      const allMessages = await client.search({ all: true })
      const unreadMessages = await client.search({ unseen: true })
      const flaggedMessages = await client.search({ flagged: true })
      const messages = options.unread
        ? unreadMessages
        : options.tagged
          ? flaggedMessages
          : allMessages
      const messagesToFetch = messages.slice(-limit - skip, -skip || undefined).reverse()
      const msglist = await fetchMessages(client, messagesToFetch)
      const filterCounts = new Map()
      let ndx = 0

      if (account.filters !== undefined && account.filters.length > 0) {
        for (const filterName of account.filters) {
          try {
            const filterList = account.lists[filterName]
            const filterTexts = filterList.map((text) => text.toLowerCase())

            const matches = msglist.filter((msg) => {
              return filterTexts.some((text) => {
                if (text.length === 0) return false
                const isDomain = !text.includes("@")
                return (
                  msg.senderEmail === text ||
                  msg.recipientEmail === text ||
                  (isDomain &&
                    (msg.senderEmail.endsWith(text) || msg.recipientEmail.endsWith(text)))
                )
              })
            })

            if (matches.length > 0) {
              // Move matching messages to filter folder
              for (const msg of matches) {
                if (msg.filter === undefined) {
                  msg.filter = filterName
                  if (src !== filterName) {
                    await client.messageMove(msg.seq, filterName)
                  }
                  if (options.tagged && src === filterName) {
                    await client.messageFlagsRemove(msg.seq, ["\\Flagged"])
                  }
                }
              }
              filterCounts.set(filterName, matches.length)
            }
          } catch (err) {
            error(err)
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

      const label = `Account: ${account.account} total(${allMessages.length.toLocaleString()}) unread(${unreadMessages.length.toLocaleString()}) limit(${messagesToFetch.length.toLocaleString()}) skipped(${skip.toLocaleString()})`
      options.brief ? brief(label) : info(chalk.green(label))

      filterCounts.forEach((count, folder) => {
        info(chalk.green(`Moved ${count} messages to ${folder}`))
      })
    } finally {
      options.brief ? brief("\n") : info("\n")
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

    // if no account is specified then use the default account
    options.account = args?.account ? args.account : dv.accountAlias

    verbose(`account: ${options.account}`)

    // if the account is all
    if (isAccountAll()) {
      for (const account of config.accounts) {
        const isActive = account.active !== false
        if (!isActive) {
          continue
        }
        const label = `${account.index}: ${account.account}`
        info("------------------------------------------------")
        info(label)
        info("------------------------------------------------")
        await refreshFilters(account)
        await scanMailbox(account, options, logger)
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
    await scanMailbox(account, options, logger)
  } catch (err) {
    error(err)
  }
}
