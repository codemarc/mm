import { load } from "./smash.js"
import chalk from "chalk"
import u from "./util.js"
const { setInstance, getAccount, info, error, verbose } = u

/**
 * ----------------------------------------------------------------------------
 * Marks all unread messages in specified folder as read
 * @param {Object} client - ImapFlow client instance
 * @param {string} folder - Target folder name
 * ----------------------------------------------------------------------------
 */
const clear = async (client, folder) => {
  const targ = await u.getFolderPath(client, folder);
  info(`clearing ${folder} from ${targ}`);
  const lock = await client.getMailboxLock(targ);
  try {
    const messages = await client.search({ unseen: true });
    if (messages.length > 0) {
      await client.messageFlagsAdd(messages, ["\\Seen"]);
      info(`marked ${messages.length} messages as read in ${folder}`);
    } else {
      info(chalk.green(`all messages have been marked as read in ${folder}`))
    }
  } finally {
    lock.release();
  }
};


/**
 * ----------------------------------------------------------------------------
 * Permanently deletes all messages from specified folder
 * @param {Object} client - ImapFlow client instance
 * @param {string} folder - Target folder name 
 * ----------------------------------------------------------------------------
 */
const empty = async (client, folder) => {
  const targ = await u.getFolderPath(client, folder)
  info(`emptying ${folder} from ${targ}`)
  const lock = await client.getMailboxLock(targ)
  try {
    const messages = await client.search({ seq: "1:*" });
    if (messages.length > 0) {
      await client.messageDelete(messages)
      info(`emptied ${folder} - ${messages.length} messages`)
    } else {
      info(chalk.green(`${folder} is already empty`)
      )
    }
  } finally {
    lock.release()
  }
}


/**
 * ----------------------------------------------------------------------------
 * Performs cleanup operations on a mailbox:
 * - Marks all messages in Archive as read
 * - Empties Trash, Spam and Drafts folders
 * @param {Object} account - Account configuration object
 * @param {Object} options - Command line options
 * @param {Object} logger - Logger instance
 * ----------------------------------------------------------------------------
 */
const cleanup = async (account) => {
  info(chalk.blue(`cleaning mailbox ${account.user}`))

  const client = u.getImapFlow(account)
  client.on('expunge', data => { verbose(data) })

  try {
    verbose("connecting to imap server")
    await client.connect()
    await clear(client, "Archive");
    await empty(client, "Trash")
    await empty(client, "Spam")
    await empty(client, "Drafts");
  } finally {
    await client.close()
  }
}

/**
 * ----------------------------------------------------------------------------
 * Main command handler for the 'clean' command
 * Cleans either a single mailbox or all configured mailboxes
 * @param {Object} args - Command line arguments
 * @param {Object} options - Command line options
 * @param {Object} logger - Logger instance for output
 * ----------------------------------------------------------------------------
 */
export async function cleanCommand(args, options, logger) {
  setInstance({ options: options, logger: logger })

  try {
    verbose("loading config")
    const config = load()

    // if no account is specified then use the default account
    options.account = args?.account
      ? args.account
      : u.dv.accountAlias

    // if the account is all then clean all accounts
    if (u.isAccountAll()) {
      verbose("cleaning all mailboxes")

      for (const account of config.accounts) {
        await cleanup(account)
      }
      return
    }

    // otherwise find and clean the selected account
    verbose(`finding mailbox associated with ${options.account}`)
    const account = getAccount(config, options.account)
    if (!account) {
      error(`${options.account} not found`)
      return
    }
    verbose(`found ${account.user}`)
    await cleanup(account)
  } catch (e) {
    error(e)
  }
}
