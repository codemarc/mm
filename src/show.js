import _ from "lodash";
import cTable from "console.table";
import { load, decrypt } from "./smash.js";
import chalk from "chalk";
import { ImapFlow } from "imapflow";
import u from "./util.js";

// ------------------------------------------------------------------------
// list the accounts
// ------------------------------------------------------------------------
const listAccounts = (config, options, logger) =>  {
  const accountNames = u.getAccountNames(config)
  if(options.quiet) {
    logger.info(accountNames.join('\n'))
    return;
  }
  // print the accounts
  const headers = ["index", "account", "user", "host", "port"];
  const values = _.map(config.accounts, (obj) => _.pick(obj, headers));
  logger.info(cTable.getTable(values));
  return;
}

// ------------------------------------------------------------------------
// show the counts for the account
// ------------------------------------------------------------------------
const showCounts = async (config, options, logger) => {

  const getMetrics = async (account) => {
    const client = new ImapFlow({
      host: account.host,
      port: account.port,
      secure: account.tls !== false,
      auth: { user: account.user, pass: decrypt(account.password, false) },
      logger: options.verbose
    });
    try {
      await client.connect();
      const lock = await client.getMailboxLock(options.folder ?? "INBOX");
      const unread = await client.search({ unseen: true });
      const total = await client.search({ all: true });
      lock.release();
      return {
        index: account.index,
        account: account.account,
        username: account.user,
        unread: unread.length.toLocaleString(),
        total: total.length.toLocaleString(),
      };
    } catch (error) {
      logger.error(error);
    } finally {
      await client.logout();
    }

  }

  // if the account is all then show the counts for all accounts
  if(options.account === "all") {
    const metrics = await Promise.all(
        _.map(config.accounts, async (account) => {
        return getMetrics(account)
      })
    )
    logger.info(cTable.getTable(metrics)); 
    return;
  }

  // otherwise show the counts for the account
  const account = u.getAccount(config, options.account);
  if (!account) {
    logger.error(chalk.red("not found\n"));
    return;
  }
  const metrics = await getMetrics(account);
  logger.info(cTable.getTable([metrics]));
}


// ------------------------------------------------------------------------
// Export the show command handler
// ------------------------------------------------------------------------
export const showCommand = async (args, options, logger) => {
	const config = load();

  // add a index property to each account
  for(let count=0;count < config.accounts.length;count++) {
    config.accounts[count].index = count+1
  }

  // list the accounts
  if(options.list) {
    listAccounts(config, options, logger);
    return;
  }

  // if no account is specified then use the default account
  options.account = args?.account ? args.account : (process.env.MM_DEFAULT_ACCOUNT ?? "all")
  if(options.verbose) logger.info(`account: ${options.account}`);

  // if count is specified then show the counts for the account
  if(options.counts) {
    showCounts(config, options, logger);
    return;
  }

  // if the account is all then show the fully loaded config
  if (options.account === "all") {
    logger.info(config);
    return;
  }

  // otherwise show the config for the account
  const account = u.getAccount(config, options.account);
  if (!account) {
    logger.error(chalk.red("not found\n"));
    return;
  }

  logger.info(account)
  logger.info("\n");
}
