import chalk from "chalk"
import _ from "lodash";
import { simpleParser } from "mailparser";
import { load } from "./smash.js"
import u from "./util.js";

/**
 * zeroUnread - Marks all unread messages in the client's mailbox as read.
 *
 * @param {Object} client - The IMAP client object with messageFlags methods
 * @param {Object} logger - Logger instance for output messages
 * @returns {Promise<void>} A promise that resolves when all messages are marked as read
 */
async function zeroUnread(client, logger) {
	const unread = await client.search({ unseen: true });
	if (unread.length > 0) {
		await client.messageFlagsAdd(unread, ["\\Seen"]);
		logger.info(chalk.green(`Marked ${unread.length} messages as read`));
	} else {
		logger.info("No unread messages found");
	}
}

// ------------------------------------------------------------------------
// scan command
// ------------------------------------------------------------------------

/**
 * Main command handler for scanning email accounts and messages
 * Processes email scanning based on provided arguments and options
 *
 * @param {Object} args - Command line arguments
 * @param {string} [args.account] - Specific account to scan
 * @param {Object} options - Command options
 * @param {boolean} [options.verbose] - Enable verbose logging
 * @param {boolean} [options.quiet] - Suppress detailed output
 * @param {boolean} [options.read] - Mark messages as read
 * @param {boolean} [options.unread] - Only show unread messages
 * @param {boolean} [options.zero] - Zero out unread count
 * @param {string} [options.folder] - Target folder to scan
 * @param {boolean} [options.archive] - Use archive folder
 * @param {number} [options.limit] - Maximum messages to scan
 * @param {number} [options.skip] - Number of messages to skip
 * @param {Object} logger - Logger instance for output
 * @returns {Promise<void>} A promise that resolves when scanning is complete
 * @throws {Error} If scanning fails or account is not found
 */
export async function scanCommand(args, options, logger) {
	try {
    const config = load();

    // add a index property to each account
    for(let count=0;count < config.accounts.length;count++) {
      config.accounts[count].index = count+1
    }

    // if no account is specified then use the default account
    options.account = args?.account ? args.account : (process.env.MM_DEFAULT_ACCOUNT ?? "all")
    if(options.verbose) logger.info(`account: ${options.account}`);

		const limit = Number.parseInt(options.limit || process.env.LIMIT || "5");
		const skip = Number.parseInt(options.skip || "0");
    
    // if the account is all
    if(options.account === "all") {
      for(const account of config.accounts) {
        logger.info(chalk.blue("\n\n------------------------------------------------"));
        logger.info(chalk.blue(`${account.index}: ${account.account}`));
        logger.info(chalk.blue("------------------------------------------------"));
        const blacklist = account.blacklist ?? [];
        await scanMailbox(logger, account, limit, blacklist, skip, options);
      }
      return;
    }
    
    // otherwise show the counts for the account
    const account = u.getAccount(config, options.account);

		if (!account) {
			logger.error(chalk.red("account not found"));
			return;
		}

    await u.refreshFilters(account);
		const blacklist = account.blacklist ?? [];
		await scanMailbox(logger, account, limit, blacklist, skip, options);

	} catch (error) {
		logger.error("Scan command failed:", error.message);
		process.exit(1);
	}
}

// ------------------------------------------------------------------------
// scan mailbox
// ------------------------------------------------------------------------

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
	const qar = [];
  const client = await u.getImapFlow(account, options, logger);

	try {
		// Connect to server
		await client.connect();

		let folder = options.folder ? options.folder : "INBOX";
    if (options.archive) {
      const folders = await client.list()
      folder = _.find(folders, (f) => f.name === "Archive")?.path ?? "[Gmail]/All Mail"
      logger.info(`Folder: ${folder}`);
    }
		let blacklistedMessageCount = 0;

		const lock = await client.getMailboxLock(folder);
		try {
			if (options.zero) {
				await zeroUnread(client, logger);
			} else {
				// Modify search to include unread filter if specified
				const searchCriteria = options.unread
					? { unseen: true }
					: { all: true };
				const messages = await client.search(searchCriteria);
				const messagesToFetch = messages.slice(
					-limit - skip,
					-skip || undefined,
				);
				if (!options.quiet) {
					logger.info(
						`Found ${messages.length} ${options.unread ? "unread " : ""}messages, showing ${messagesToFetch.length} (skipping ${skip})\n`,
					);
				}

				// Fetch messages
				for (const seq of messagesToFetch) {
					const message = await client.fetchOne(seq, { source: true });
					const parsed = await simpleParser(message.source);

					const senderEmail = parsed.from?.value?.[0]?.address?.toLowerCase();
					const recipientEmail = parsed.to?.value?.[0]?.address?.toLowerCase();
					const isBlacklisted = blacklist.some((blocked) => {
            if (blocked.length === 0) return false;
						const blc = blocked.toLowerCase();
						return (
							blc === senderEmail ||
							blc === recipientEmail ||
							(blc.indexOf("@") === -1 && senderEmail.endsWith(blc))
						);
					});

					const seqString =
						chalk.blue(`Seqno: ${seq}`) +
						(isBlacklisted ? chalk.red(" BLACKLISTED") : "");

					if (options.quiet) {
						qar.push(seq);
					} else {
						logger.info(seqString);
						logger.info(`From: ${parsed.from?.text || "(unknown sender)"}`);
						logger.info(`To: ${parsed.to?.text || "(unknown recipient)"}`);
						logger.info(`Subject: ${parsed.subject || "(no subject)"}`);
						logger.info(`Date: ${u.roundToMinutes(parsed.date)}` || "(no date)");
						logger.info("\n");
					}

					// Mark message as read
					if (options.read) {
						await client.messageFlagsAdd(seq, ["\\Seen"]);
					}

					if (isBlacklisted) {
						blacklistedMessageCount++;
						await client.messageMove(seq, "Blacklisted");
					}
				}
				if (!options.quiet) {
					logger.info(
						chalk.yellow(`Blacklisted ${blacklistedMessageCount} messages`),
					);
				}
			}
		} finally {
			// Always release the lock
			lock.release();
		}
		if (qar.length > 0) {
			logger.info(`"${qar.join(",")}"`);
		}
	} catch (err) {
		logger.error(`Error scanning account ${account.account}:`, err.message);
	} finally {
		await client.logout();
	}
}
