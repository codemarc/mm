import util from "./util.js"
export const u = new util()

// ----------------------------------------------------------------------------
// getSearchOptions
// https://imapflow.com/global.html#SearchObject
// ----------------------------------------------------------------------------

const getSearchOptions = (options) => {
  // set the search options
  let searchOptions = {}

  // add the unread option
  if (options.unread) searchOptions = Object.assign(searchOptions, { unseen: true })

  // add the tagged option
  if (options.tagged) searchOptions = Object.assign(searchOptions, { flagged: true })

  // add the date option
  if (options.date) {
    // if the date is true or "today", set the search options to today
    if (options.date === true || options.date === "today")
      searchOptions = Object.assign(searchOptions, { on: new Date() })

    // if the date is "yesterday", set the search options to yesterday
    if (options.date === "yesterday")
      searchOptions = Object.assign(searchOptions, {
        on: new Date(new Date().setDate(new Date().getDate() - 1))
      })

    // if the date is a number, set the search options to the date
    if (options.date < 0)
      searchOptions = Object.assign(searchOptions, {
        since: new Date(new Date().setDate(new Date().getDate() - Number.parseInt(options.date)))
      })

    // if the date is a date object, set the search options to the date
    if (options.date instanceof Date)
      searchOptions = Object.assign(searchOptions, { since: options.date })
  }

  // return the search options
  if (Object.keys(searchOptions).length === 0) searchOptions = { all: true }
  return searchOptions
}

// ----------------------------------------------------------------------------
// fetch
// ----------------------------------------------------------------------------
export default async function fetch(client, options) {
  u.verbose("fetch: fetching messages")

  // get the folder option
  const opt = options.folder && typeof options.folder === "string" ? options.folder : "INBOX"
  u.verbose(`fetch: from folder ${opt}`)

  // get the folder path
  const src = await u.getFolderPath(client, opt)
  u.verbose(`fetch: resolved as ${src}`)

  // lock the mailbox to prevent other processes from accessing it
  const lock = await client.getMailboxLock(src)
  u.brief("  mailbox locked")
  u.verbose(`fetch: ${src} mailbox locked`)

  try {
    // get the search options
    const searchOptions = getSearchOptions(options)

    // get the messages
    const messages = await client.search(searchOptions)

    // get the limit and skip options
    const limit = Number.parseInt(options.limit || u.dv.scanLimit)

    // get the skip option
    const skip = Number.parseInt(options.skip || "0")

    // get the messages to fetch
    const messagesToFetch = messages.slice(-limit - skip, -skip || undefined)

    // fetch the messages
    const msglist = await client.fetchAll(messagesToFetch, { source: true })
    u.brief("  messages fetched")

    // return the messages
    return msglist

    // if verbose, show the stack trace
  } catch (err) {
    if (options.verbose) u.verbose(err.stack)
    else u.error(err)

    // always release the mailbox lock
  } finally {
    lock.release()
    u.brief("  mailbox unlocked")
  }
}
