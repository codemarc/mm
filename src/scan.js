import chalk from "chalk";
import { ImapFlow } from "imapflow";
import _ from "lodash";
import { simpleParser } from "mailparser";
import { load, decrypt } from "./smash.js";

export async function scanCommand(args, options, logger) {
	try {
		const limit = Number.parseInt(options.limit || "3");
		const config = load();
		const account = options.account
			? _.find(config.accounts, { account: options.account })
			: _.first(config.accounts);

		if (!account) {
			logger.error(chalk.red("account not found"));
			return;
		}

		const blacklist = account.blacklist ?? [];
		await scanMailbox(logger, account, limit, blacklist);
	} catch (error) {
		logger.error("Scan command failed:", error.message);
		process.exit(1);
	}
}

function roundToMinutes(date) {
	const d = new Date(date);
	return new Date(
		d.getFullYear(),
		d.getMonth(),
		d.getDate(),
		d.getHours(),
		d.getMinutes(),
	);
}

async function scanMailbox(logger, account, limit, blacklist) {
	const client = new ImapFlow({
		host: account.host,
		port: account.port,
		secure: account.tls !== false,
		auth: {
			user: account.user,
			pass: decrypt(account.password, false),
		},
		logger: false,
	});

	try {
		// Connect to server
		await client.connect();

		// Select and lock INBOX
		const lock = await client.getMailboxLock('INBOX');
		try {
			// Get message count
			const messages = await client.search({ all: true });
			const messagesToFetch = messages.slice(-limit); // Get last 'limit' messages
			logger.info(`Found ${messagesToFetch.length} messages\n`);

			const blacklistedMessages = [];

			// Fetch messages
			for (const seq of messagesToFetch) {
				const message = await client.fetchOne(seq, { source: true });
				const parsed = await simpleParser(message.source);
				
				const senderEmail = parsed.from?.value?.[0]?.address?.toLowerCase();
        const recipientEmail = parsed.to?.value?.[0]?.address?.toLowerCase();
				const isBlacklisted = blacklist.some(
					(blocked) => {
            const blc = blocked.toLowerCase()
            return blc === senderEmail 
                || blc === recipientEmail
                || (blc.startsWith('domain:') && senderEmail.endsWith(blc.slice(7)))
          }
				);
				
				const seqString = chalk.blue(`Seqno: ${seq}`) + 
					(isBlacklisted ? chalk.red(' BLACKLISTED') : '');

				if (isBlacklisted) {
					blacklistedMessages.push(seq);
				}

				logger.info(seqString);
				logger.info(`From: ${parsed.from?.text || "(unknown sender)"}`);
				logger.info(`To: ${parsed.to?.text || "(unknown recipient)"}`);
				logger.info(`Subject: ${parsed.subject || "(no subject)"}`);
				logger.info(`Date: ${roundToMinutes(parsed.date)}` || "(no date)");
				logger.info("\n");

				// Mark message as read
				await client.messageFlagsAdd(seq, ['\\Seen']);
			}

			// Process blacklisted messages
			if (blacklistedMessages.length > 0) {
				// Try different possible folder paths
				const possiblePaths = [
					'Blacklisted',
					'[Gmail]/Blacklisted',
					'INBOX/Blacklisted'
				];

				let folderCreated = false;
				for (const path of possiblePaths) {
					try {
						await client.mailboxCreate(path);
						folderCreated = true;
						
						// Move messages to the successfully created folder
						for (const seq of blacklistedMessages) {
							await client.messageMove(seq, path);
						}

						logger.info(
							chalk.yellow(
								`Moved ${blacklistedMessages.length} blacklisted messages to ${path}`
							)
						);
						break; // Exit loop after successful creation and move
					} catch (err) {
						// If folder exists, try to use it
						try {
							// Attempt to move messages to existing folder
							for (const seq of blacklistedMessages) {
								await client.messageMove(seq, path);
							}
							
							logger.info(
								chalk.yellow(
									`Moved ${blacklistedMessages.length} blacklisted messages to existing ${path}`
								)
							);
							folderCreated = true;
							break;
						} catch (moveErr) {
              logger.error(chalk.red(`Failed to move messages: ${moveErr.message}`));
							// Continue to next path if this one fails
						}
					}
				}

				if (!folderCreated) {
					logger.error(chalk.red('Failed to create or find a blacklist folder'));
				}
			}
		} finally {
			// Always release the lock
			lock.release();
		}

		// Close connection
		await client.logout();
	} catch (err) {
		logger.error(`Error scanning account ${account.account}:`, err.message);
	}
}
