import chalk from "chalk"
import { ImapFlow } from "imapflow"
import _ from "lodash"
import { simpleParser } from "mailparser"
import { load, decrypt } from "./smash.js"
import u from "./util.js"

export async function readCommand(args, options, logger) {
  try {
    const config = load()
    const account = options.account
      ? _.find(config.accounts, { account: options.account })
      : _.first(config.accounts)

    if (!account) {
      logger.error(chalk.red("account not found"))
      return
    }

    // Parse sequence numbers from comma-separated string or use default
    const seqnos = args.seq
      ? args.seq.split(',').map(s => s.trim())
      : ['-1'] // Default to last message

    const client = u.getImapFlow(account)

    try {
      await client.connect()
      const lock = await client.getMailboxLock('INBOX')

      try {
        // Apply unread filter if specified
        const searchCriteria = options.unread ? { unseen: true } : { all: true }
        const messages = await client.search(searchCriteria)

        // Apply skip if specified
        const skip = Number.parseInt(options.skip || "0")
        const availableMessages = messages.slice(skip)

        for (const arg of seqnos) {
          const seqno = Number.parseInt(arg)
          if (Number.isNaN(seqno)) {
            logger.error(chalk.red(`Invalid sequence number: ${arg}`))
            continue
          }

          const actualSeqno = seqno > 0 ? seqno : availableMessages[availableMessages.length + seqno]
          if (!actualSeqno) {
            logger.error(chalk.red(`Message ${seqno} not found`))
            continue
          }

          const message = await client.fetchOne(actualSeqno, { source: true })
          const parsed = await simpleParser(message.source)

          logger.info(chalk.blue(`Seqno: ${actualSeqno}`))
          logger.info(`From: ${parsed.from?.text || "(unknown sender)"}`)
          logger.info(`To: ${parsed.to?.text || "(unknown recipient)"}`)
          logger.info(`Subject: ${parsed.subject || "(no subject)"}`)
          logger.info(`Date: ${u.roundToMinutes(parsed.date)}` || "(no date)")
          logger.info(`\nMessage:\n${parsed.text || "(no text content)"}\n`)

          await client.messageFlagsAdd(actualSeqno, ['\\Seen'])
          logger.info(chalk.green(`Marked message ${actualSeqno} as read\n`))
        }
      } finally {
        lock.release()
      }

      await client.logout()
    } catch (err) {
      logger.error('Error reading messages:', err.message)
    }
  } catch (error) {
    logger.error("Read command failed:", error.message)
    process.exit(1)
  }
}
