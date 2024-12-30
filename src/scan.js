import chalk from "chalk"
import _ from "lodash"
import { simpleParser } from "mailparser"
import { load } from "./smash.js"
import u from "./util.js"
const { setInstance, getAccount, info, error, verbose, brief, dv } = u

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
    const skip = Number.parseInt(options.skip || "0")

    // if no account is specified then use the default account
    options.account = args?.account ? args.account : dv.accountAlias

    verbose(`account: ${options.account}`)

    // if the account is all
    if (u.isAccountAll()) {
      for (const account of config.accounts) {
        const label = `${account.index}: ${account.account}`
        info("\n\n------------------------------------------------")
        options.brief ? brief(label) : info(label)
        info("------------------------------------------------")
        const blacklist = account.blacklist ?? []
        await scanMailbox(logger, account, limit, blacklist, skip, options)
      }
      return
    }

    // otherwise show the counts for the account
    const account = getAccount(config, options.account)

    if (!account) {
      error("account not found")
      return
    }

    await u.refreshFilters(account)
    const blacklist = account.blacklist ?? []
    await scanMailbox(logger, account, limit, blacklist, skip, options)
  } catch (err) {
    error(err)
  }
}

/**
 * Scans a single mailbox for messages matching specified criteria
 * Handles message fetching, parsing, blacklist checking, and message actions
 *
 * @param {Object} logger - Logger instance for output
 * @param {Object} account - Account configuration object
 * @param {string} account.account - Account identifier
 * @param {Array<string>} account.blacklist - Blacklisted email addresses/domains
 * @param {number} limit - Maximum number of messages to process
 * @param {Array<string>} blacklist - Array of blacklisted addresses/domains
 * @param {number} skip - Number of messages to skip
 * @param {Object} options - Scanning options
 * @param {boolean} [options.quiet] - Suppress detailed output
 * @param {boolean} [options.read] - Mark messages as read
 * @param {boolean} [options.unread] - Only show unread messages
 * @param {boolean} [options.zero] - Zero out unread count
 * @param {string} [options.folder] - Target folder to scan
 * @param {boolean} [options.archive] - Use archive folder
 * @returns {Promise<void>} A promise that resolves when mailbox scanning is complete
 * @throws {Error} If mailbox scanning encounters an error
 */
async function scanMailbox(logger, account, limit, blacklist, skip, options) {
  const qar = []
  const client = await u.getImapFlow(account)

  try {
    // Connect to server
    await client.connect()

    const folder = await u.getFolderPath(
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
            if (isBlacklisted) brief(seqString)
            info(`From: ${parsed.from?.text || "(unknown sender)"}`)
            info(`To: ${parsed.to?.text || "(unknown recipient)"}`)
            info(`Subject: ${parsed.subject || "(no subject)"}`)
            info(`Date: ${u.roundToMinutes(parsed.date)}` || "(no date)")
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
        logger.info(chalk.yellow(`Blacklisted ${blacklistedMessageCount} messages`))
      }
    } finally {
      // Always release the lock
      lock.release()
    }
    if (qar.length > 0) {
      logger.info(`"${qar.join(",")}"`)
    }
  } catch (err) {
    logger.error(`Error scanning account ${account.account}:`, err.message)
  } finally {
    await client.logout()
  }
}
