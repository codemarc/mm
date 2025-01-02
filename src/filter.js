import chalk from "chalk"
import cTable from "console.table"
import { load } from "./smash.js"
import { brief, dv, error, info, setInstance, verbose } from "./util.js"
import { getFolderPath, refreshFilters, roundToMinutes } from "./util.js"
import { getAccount, getImapFlow, isAccountAll } from "./util.js"

export async function filterCommand(args, options, logger) {
  setInstance({ options: options, logger: logger })

  try {
    verbose("loading config")
    const config = load()

    // if no account is specified then use the default account
    options.account = args?.account ? args.account : dv.accountAlias

    verbose(`account: ${options.account}`)

    // if the account is all
    if (isAccountAll()) {
      const tableData = []
      for (const account of config.accounts) {
        await refreshFilters(account)
        tableData.push({
          index: chalk.black(account.index),
          account: chalk.black(account.account),
          filters: chalk.blueBright(account.filters?.length ?? "0")
        })
      }
      info(`\n${cTable.getTable(tableData)}`)
      return
    }

    // otherwise use the specified account
    const account = getAccount(config, options.account)

    if (!account) {
      error("account not found")
      return
    }

    const client = await getImapFlow(account)
    try {
      const tableData = []
      await refreshFilters(account)
      await client.connect()
      const folders = await client.list()

      for (const filter of account.filters) {
        const filterName = filter.split(":")[0]
        const folderExists = folders.some((folder) => folder.name === filterName)
        let msgcount = 0

        if (!folderExists) {
          info(`Folder ${filterName} does not exist`)
          if (options.create) {
            info(`Creating folder ${filterName}`)
            msgcount = "created"
            await client.mailboxCreate(filterName)
          }
        } else {
          verbose(`Folder ${filterName} exists`)
          if (options.delete && options.delete === filterName) {
            info(`Deleting folder ${filterName}`)
            msgcount = "deleted"
            await client.mailboxDelete(filterName)
          } else {
            const lock = await client.getMailboxLock(filterName)
            try {
              const allMessages = await client.search({ all: true })
              msgcount = allMessages.length.toLocaleString()
            } finally {
              lock.release()
            }
          }
        }

        tableData.push({
          filter: filterName,
          entries: account[filterName].length,
          exists: folderExists ? chalk.green("yes") : chalk.red("no"),
          count: msgcount
        })
      }
      info(`\n${cTable.getTable(tableData)}`)
    } catch (err) {
      error(err)
    } finally {
      await client.logout()
    }
  } catch (err) {
    error(err)
  }
}
