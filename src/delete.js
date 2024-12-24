import chalk from "chalk";
import _ from "lodash";
import { load } from "./smash.js"
import u from "./util.js";

// the gmail workaround to get the right folder path
const getFolderPath = async (client, name) => {
  const folders = await client.list()
  if (name === "Archive") {
    return _.find(folders, (f) => f.name === name)?.path ?? "[Gmail]/All Mail"
  }
  return _.find(folders, (f) => f.name === name)?.path
}

// ------------------------------------------------------------------------ 
// empty
// ------------------------------------------------------------------------
const empty = async (client, logger, folder) => {
  const targ = await getFolderPath(client, folder)
  const lock = await client.getMailboxLock(targ);
	try {
		// Search for all messages
		const messages = await client.search({ all: true });
		if (messages.length > 0) {
			// Delete all messages found
			await client.messageDelete(messages);
			logger.info(
        chalk.green(`Emptied ${targ} - ${messages.length} messages`),
			);
		} else {
      logger.info(`${targ} is already empty`);
		}
	} finally {
		lock.release();
	}
};


// ------------------------------------------------------------------------
// mark archive read
// ------------------------------------------------------------------------
const markArchiveRead = async (client, logger) => {
  const folder = await getFolderPath(client, "Archive")
  const lock = await client.getMailboxLock(folder)
  const searchCriteria = { unseen: true }
  const unread = await client.search(searchCriteria)
  if (unread.length > 0) {
    // mark all messages as read
    logger.info(`Marking ${unread.length} ${folder} as read`)
    await client.messageFlagsAdd(unread, ["\\Seen"])
  } else {
    logger.info(`${folder} cleared`)
  }
  lock.release()
}

// ------------------------------------------------------------------------
// trashem
// ------------------------------------------------------------------------
const trashem = async (client, logger, folder) => {
  const trash = getFolderPath(client, "Trash")
	const lock = await client.getMailboxLock(folder);
	try {
    // move all messages to trash
    const messages = await client.search({ all: true });
		if (messages.length > 0) {
      await client.messageMove(messages, trash);
      logger.info(chalk.green(`Moved ${messages.length} messages to Trash`));
    } else {
      logger.info(`${folder} is already empty`);
    }
	} finally {
		lock.release();
	}
};

// ------------------------------------------------------------------------
// get client
// ------------------------------------------------------------------------
const getClient = async (account, options, logger) => {
  try {
    const client = u.getImapFlow(account, options, logger);
    if(!options.test)  {
      await client.connect();
    }
    return client;
  } catch (e) {
    logger.error(chalk.red(`error: ${e}`));
    return null;
  }
}

// ------------------------------------------------------------------------
// delete command
// ------------------------------------------------------------------------
export async function deleteCommand(args, options, logger) {
	try {
		const config = load();

    // add a index property to each account
    for(let count=0;count < config.accounts.length;count++) {
      config.accounts[count].index = count+1
    }

    // if no account is specified then use the default account
    options.account = args?.account ? args.account : (process.env.MM_DEFAULT_ACCOUNT ?? "all")
    if(options.verbose) logger.info(`account: ${options.account}`);


    // if empty is true, empty all accounts
    if(options.empty && options.account === "all") {
      for(const account of config.accounts) {
        logger.info(chalk.blue("\n\n------------------------------------------------"));
        logger.info(chalk.blue(`${account.index}: ${account.account} ${account.user}`));
        logger.info(chalk.blue("------------------------------------------------"));
        const client = await getClient(account, options, logger);
        if(client) {
          await markArchiveRead(client, logger);
          await empty(client, logger, "Drafts");
          await empty(client, logger, "Trash");
          await empty(client, logger, "Spam");
          await client.logout();
        }
      }
      return;
    }
    
    const account = u.getAccount(config, options.account);
		if (!account) {
			logger.error(chalk.red("account not found"));
			return;
		}
		logger.info(chalk.green(`deleting from account: ${account.account}`));

		// Using seqno lets create the different use cases
		// +n - last n messages
		// -n - first n messages
		// n-m - messages n to m
		// n,m,o - messages n, m, o
		let seqnos = [];
		if (args.seq?.startsWith("+")) {
			seqnos = [(-1 * Number.parseInt(args.seq.substr(1))).toString()];
		} else if (args.seq?.startsWith("-")) {
			seqnos = [args.seq];
		} else if (args.seq?.substr(1).indexOf("-") > -1) {
			seqnos = args.seq.split(",").map((s) => s.trim());
		}

		// for each seqno, expand it to a range if it contains a hyphen
		// otherwise, just add it to the list
		let expanded = seqnos.flatMap((seqno) => {
			const match = seqno.match(/^(\d+)-(\d+)$/);
			if (match) {
				const start = Number.parseInt(match[1]);
				const end = Number.parseInt(match[2]);
				return Array.from({ length: end - start + 1 }, (_, i) => start + i);
			}
			return [Number.parseInt(seqno)];
		});

		if (expanded.length === 0) {
			logger.info(chalk.red("no messages to delete"));
		}

		if (options.test) {
			logger.info(chalk.yellow("test mode, not actually deleting"));
		}

    const client = await getClient(account, options, logger);

		if (expanded.length > 0) {
			logger.info(
				chalk.green(`moving messages to trash: ${expanded.join(", ")}`),
			);
			if (!options.test) {
				const lock = await client.getMailboxLock("INBOX");
				try {
					if (expanded.length > 0) {
						const messages = await client.search({ all: true });
						if (options.limit) {
							// Get n messages starting from the specified offset
							expanded = Array.from(
								{ length: options.limit },
								(_, i) => messages[messages.length + expanded[0] - i],
							).filter(Boolean);
						} else {
							expanded = messages[messages.length + expanded[0]];
						}
					}
          const trash = await getFolderPath(client, "Trash")
          await client.messageMove(expanded, trash);
				} catch (err) {
          logger.error(chalk.red(`error: ${err}`));
				}
				lock.release();
			}
		}


		// move all messages to trash
		if (options.folder && typeof options.folder === "string") {
			await trashem(client, logger, options.folder);
		} else if (options.folder && typeof options.folder === "boolean") {
			await trashem(client, logger, "Blacklisted");
		}

		// empty trash and spam
		if (options.empty) {
      await markArchiveRead(client, logger);
      await empty(client, logger, "Drafts");
			await empty(client, logger, "Trash");
			await empty(client, logger, "Spam");
		}

		// close connection
		await client.logout();
	} catch (e) {
		logger.error(chalk.red(`error: ${e}`));
	}
}
