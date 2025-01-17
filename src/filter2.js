import chalk from "chalk"
import cTable from "console.table"
import _ from "lodash"
import { simpleParser } from "mailparser"
import * as u from "./util.js"
const { dv, error, info, verbose, isAccount } = u

// ----------------------------------------------------------------------------
// explain the filter command
// ----------------------------------------------------------------------------
export async function explain() {
  info(chalk.blueBright("\nThe Filter Command"))
  info(chalk.blueBright("--------------------"))
  info(`The filter command is used to manage messages in folders, based on rules
and filters. It can be used to list all filters for an account, create missing 
folders or delete deprecated filtered folders.

    * if you pass "list" as the account name then the account list is displayed

    * creates missing filter folders when --create option is used with account name

    * deletes specified filter folder when --delete option is used with account name

    * scans messages in filter folders when --scan option is used

try mm filter --help for more information    
    
`)
}

/**
 * ----------------------------------------------------------------------------
 * filter command
 * ----------------------------------------------------------------------------
 */
export async function filterCommand(args, options, logger) {
  const config = u.setInstance({ args, options, logger })
  try {
    if (config == null || isAccount("list")) return

    // an account name or index was passed and it was not "all"
    const account = u.isAccountAll() ? "all" : u.getAccount(config, options.account)
    if (account !== "all") {
      if (!account) {
        error("account not found")
        return
      }

      // if the all OPTION is not set then skip inactive accounts
      if (!account.active && !options.all) {
        info(`\nskipping ${account.account.name} (inactive)`)
        return
      }
    }

    // connect to the account and get the current folder list
    const client = await getImapFlow(account, true)
    try {
      await client.connect()

      if (options.scan) {
        await scanFilters(client, config, account, options)
        return
      }

      // https://imapflow.com/global.html#ListResponse
      const folders = await client.list({
        statusQuery: { messages: true }
      })

      // for each filter in the account, make sure its folder exists
      const tableData = []
      for (const filter of config[account.name].filters ?? []) {
        const folder = folders.find(
          (folder) => (folder.specialUse ? folder.name : folder.path) === filter.folder
        )
        verbose(`folder: ${folder?.name}, path: ${folder?.path}`)

        const folderExists = folders.some(
          (folder) => (folder.specialUse ? folder.name : folder.path) === filter.folder
        )
        const folderPath = folder?.path

        verbose(
          `filter: ${filter.list}, folder: ${filter.folder}, exists: ${folderExists}, path: ${folderPath}`
        )
        if (!folderExists) {
          info(`folder ${filter.folder} for list ${filter.list} does not exist`)
          if (options.create) {
            info(`Creating folder ${filter.folder}`)
            await client.mailboxCreate(filter.folder)
            info(`folder ${filter.folder} created`)
            return
          }
        } else {
          verbose(`folder ${filter.folder} for list ${filter.list} exists`)
          if (options.delete && options.delete === filter.list) {
            info(`Deleting folder ${filter.folder}`)
            await client.mailboxDelete(filter.folder)
            info(`folder ${filter.folder} deleted`)
          }
        }

        tableData.push({
          filter: filter.list,
          folder: filter.folder,
          exists: folderExists ? chalk.green("yes") : chalk.red("no"),
          emails: filter.active?.length ?? 0,
          found: filter.found?.length ?? 0,
          messages: folder?.status.messages ?? 0
        })
      }
      if (tableData.length === 0) {
        info(chalk.red(`\nNo filters found for ${account.account}\n`))
      } else {
        info(`\n${cTable.getTable(tableData)}`)
      }
    } catch (err) {
      if (options.verbose) verbose(chalk.red(err.stack))
      else error(err)
    } finally {
      await client.logout()
    }
  } catch (err) {
    if (options.verbose) verbose(chalk.red(err.stack))
    else error(err)
  }
}

// ----------------------------------------------------------------------------
// scan filters
// ----------------------------------------------------------------------------
async function scanFilters(client, config, account, options) {
  verbose(`scanFilters(${account.name}) filter=${options.scan}`)
  const tableData = []

  const fetchMessages = async (client, messagesToFetch) => {
    const msglist = []
    for (const seq of messagesToFetch) {
      const message = await client.fetchOne(seq, { source: true })
      const parsed = await simpleParser(message.source)
      const msg = parsed.from?.value?.[0]?.address
      client.messageFlagsRemove(seq, ["\\Flagged"])
      if (!msglist.includes(msg)) msglist.push(msg)
    }
    return msglist
  }

  for (const filter of config[account.name].filters ?? []) {
    if (typeof options.scan === "string" && options.scan !== filter.list) continue

    const lock = await client.getMailboxLock(filter.folder)
    try {
      const messages = await fetchMessages(client, await client.search({ flagged: true }))

      tableData.push({
        filter: filter.list,
        folder: filter.folder,
        unique: messages.length
      })

      if (messages.length > 0) {
        const item = _.find(config[account.name].filters, (n) => {
          return n.list === filter.list
        })
        item.found = messages
      }
    } catch (err) {
      error(`Error scanning filter ${filter.list}: ${err.message}`)
    } finally {
      lock.release()
    }
  }

  if (tableData.length === 0) {
    info(chalk.red(`\nNo filters found for ${account.account}\n`))
  } else {
    info(`\n${cTable.getTable(tableData)}`)
  }
  save(account.name, config[account.name])
}
