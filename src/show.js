import _ from "lodash";
import cTable from "console.table";
import { load, decrypt } from "./smash.js";
import chalk from "chalk";
import u from "./util.js";

// Export the show command handler
export const showCommand = async (args, options, logger) => {
	const config = load();
  
  if (options.verbose) {
    logger.info(config);
    return;
  }

  if (options.account && typeof options.account === "boolean") {
    const headers = ["account", "user", "host", "port"];
    const values = _.map(config.accounts, (obj) => _.pick(obj, headers));
    logger.info(cTable.getTable(values));
    return;
  }

	if (!options.account){
		u.printAccountNames(config, options, logger);
		return;
	}
	
  const account = u.getAccount(config, options.account);
  if (!account) {
    logger.error(chalk.red("account not found"));
    u.printAccountNames(config, options, logger);
    return;
  }
	logger.info(account);
}
