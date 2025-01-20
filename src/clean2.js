import chalk from "chalk"
import * as u from "./util.js"
const { brief, error, info, verbose } = u

// ----------------------------------------------------------------------------
// explain the clean command
// ----------------------------------------------------------------------------
export async function explain() {
  info(chalk.blueBright("\nThe Clean Command"))
  info(chalk.blueBright("-------------------"))
  info(`The clean command clears the unread flag in the archive folder
then it empties the drafts, spam and trash folders

  * If you pass no arguments then clean applies to all accounts
  * if you pass "list" in the account name then hte account list is displayed
  * If you pass the account name or index then clean applies to that account

try mm clean --help for more information
`)
}

/**
 * ----------------------------------------------------------------------------
 * clean command
 * ----------------------------------------------------------------------------
 */
export async function cleanCommand(args, options, logger) {
  const config = u.setInstance({ args, options, logger })
  try {
    if (config == null || u.isAccount("list")) return

    // an account name or index was passed and it was not all
    if (!u.isAccountAll()) {
      const account = u.getAccount(config, options.account)
      if (!account) {
        error("account not found")
        return
      }
      // if the all option is not set then skip inactive accounts
      if (!config[account.name].active && !options.all) {
        info(`\nskipping ${account.name} (inactive)`)
        return
      }
      // clean the account
      verbose(`cleaning ${account.name}/${account.user}`)
      await cleanup(account)
      return
    }

    // otherwise loop over all accounts
    for (const accountName of Object.keys(config)) {
      const account = config[accountName].account
      if (!config[accountName].active && !options.all) {
        verbose(`skipping ${account.name}/${account.user}`)
        continue
      }
      verbose(`cleaning ${account.name}/${account.user}`)
      await cleanup(account)
    }
  } catch (err) {
    if (options.verbose) verbose(chalk.red(err.stack))
    else error(err)
  }
}

// ----------------------------------------------------------------------------
// Helper function to get folder path and acquire mailbox lock
// ----------------------------------------------------------------------------
const getFolderAndLock = async (client, folder, op = "processing") => {
  const targ = await u.getFolderPath(client, folder)
  info(`${op} ${folder} from ${targ}`.toLowerCase())
  return await client.getMailboxLock(targ)
}

// ----------------------------------------------------------------------------
// Marks all unread messages in specified folder as read
// ----------------------------------------------------------------------------
const clear = async (client, folder) => {
  const lock = await getFolderAndLock(client, folder, "clearing")
  const fold = folder.toLowerCase()
  try {
    const messages = await client.search({ unseen: true })
    if (messages.length > 0) {
      await client.messageFlagsAdd(messages, ["\\Seen"])
      info(`marked ${messages.length} messages as read in ${fold}`)
    } else {
      info(chalk.green(`all messages have been marked as read in ${fold}`))
    }
  } finally {
    lock.release()
  }
}

// ----------------------------------------------------------------------------
// Permanently deletes all messages from specified folder
// ----------------------------------------------------------------------------
const empty = async (client, folder) => {
  const lock = await getFolderAndLock(client, folder, "emptying")
  const fold = folder.toLowerCase()
  try {
    const messages = await client.search({ all: true })
    if (messages.length > 0) {
      await client.messageDelete(messages)
      info(`emptied ${fold} - ${messages.length} messages`)
    } else {
      info(chalk.green(`${fold} is already empty`))
    }
  } finally {
    lock.release()
  }
}

// ----------------------------------------------------------------------------
// cleanup
// ----------------------------------------------------------------------------
const cleanup = async (account) => {
  info(chalk.blue(`\ncleaning ${account.name} ${account.user}`))

  const client = u.getImapFlow(account, true)
  client.on("expunge", (data) => {
    verbose(data)
  })

  try {
    verbose("connecting to imap server")
    await client.connect()
    await Promise.all([
      clear(client, "Archive"),
      empty(client, "Trash"),
      empty(client, "Spam"),
      empty(client, "Drafts")
    ])
  } finally {
    await client.close()
  }
}
