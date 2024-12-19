import chalk from "chalk";
import { ImapFlow } from "imapflow";
import _ from "lodash";
import cTable from "console.table";
import { simpleParser } from "mailparser";
import { load, decrypt } from "./smash.js";
import u from "./util.js";

async function zeroUnread(client, logger) {
	const unread = await client.search({ unseen: true });
	if (unread.length > 0) {
		await client.messageFlagsAdd(unread, ["\\Seen"]);
		logger.info(chalk.green(`Marked ${unread.length} messages as read`));
	} else {
		logger.info("No unread messages found");
	}
}

async function getMetrics(config, logger) {
	const metrics = await Promise.all(
		_.map(config.accounts, async (account) => {
			const client = new ImapFlow({
				host: account.host,
				port: account.port,
				secure: account.tls !== false,
				auth: { user: account.user, pass: decrypt(account.password, false) },
				logger: false,
			});
			try {
				await client.connect();
				const lock = await client.getMailboxLock("INBOX");
				const unread = await client.search({ unseen: true });
				const total = await client.search({ all: true });
				lock.release();
				return {
					account: account.account,
					blacklist: account.blacklist.length.toLocaleString(),
					unread: unread.length.toLocaleString(),
					total: total.length.toLocaleString(),
				};
			} catch (error) {
				logger.error(error);
			} finally {
				await client.logout();
			}
		}),
	);
	logger.info(cTable.getTable(metrics));
}

export async function scanCommand(args, options, logger) {
	try {
    const config = load();

    if (options.metrics) {
			getMetrics(config, logger);
			return;
		}

		const limit = Number.parseInt(options.limit || "3");
		const skip = Number.parseInt(options.skip || "0");
		const account = u.getAccount(config, options.account);

		if (!account) {
			logger.error(chalk.red("account not found"));
			return;
		}

		const blacklist = account.blacklist ?? [];
		await scanMailbox(logger, account, limit, blacklist, skip, options);
	} catch (error) {
		logger.error("Scan command failed:", error.message);
		process.exit(1);
	}
}


async function scanMailbox(logger, account, limit, blacklist, skip, options) {
	const qar = [];

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

		let folder = options.folder ? options.folder : "INBOX";
    if (options.archive) {
      folder = "[Gmail]/All Mail";  
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
