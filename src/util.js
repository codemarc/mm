import _ from "lodash"
import { ImapFlow } from "imapflow"
import { decrypt } from "./smash.js"

//  ------------------------------------------------------------------------
// get account
// ------------------------------------------------------------------------
const getAccount = (config, alias) => {
  if (typeof alias === "boolean" || alias === undefined) {
    return _.first(config.accounts)
  }
  if (typeof alias === "string" && alias.length > 0) {
    const acct = _.find(config.accounts, { account: alias })
    if (acct) {
      return acct
    }
  }
  const accno = Number.parseInt(alias)
  if (Number.isNaN(accno) || accno.toString() !== alias) {
    return undefined
  }
  return config.accounts[accno - 1]
}

// ------------------------------------------------------------------------
// get account name
// ------------------------------------------------------------------------
const getAccountNames = (config) => {
  return _.map(config.accounts, "account").toString().split(",")
}

// ------------------------------------------------------------------------
// print account names
// ------------------------------------------------------------------------
const printAccountNames = (config, options, logger) => {
  const field = "account"
  if (options.quiet) {
    logger.info(_.map(config.accounts, field).toString().replace(/,/g, "\n"))
  } else {
    const accounts = _.map(config.accounts, field).toString().split(",")
    let count = 0
    for (const account of accounts) {
      logger.info(`${count + 1}. ${account}`)
      count++
    }
  }
}

// ------------------------------------------------------------------------
// round to minutes
// ------------------------------------------------------------------------
const roundToMinutes = (date) => {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date")
  }
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
  )
}

// ------------------------------------------------------------------------
// export
// ------------------------------------------------------------------------
export function getImapFlow(account, options, logger) {
  return new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.tls !== false,
    auth: { user: account.user, pass: decrypt(account.password, false) },
    logger: options.verbose ? logger : false
  })
}


// ------------------------------------------------------------------------
// export
// ------------------------------------------------------------------------
export default {
  getImapFlow,
  getAccount,
  getAccountNames,
  printAccountNames,
  roundToMinutes,
}
