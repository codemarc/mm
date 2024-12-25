import { ImapFlow } from "imapflow";
import _ from "lodash";
import fs from "node:fs";
import path from "node:path";
import { decrypt } from "./smash.js";

/**
 * Retrieves an account from the provided configuration based on the given alias.
 *
 * @param {Object} config - The configuration object containing the accounts
 * @param {Array} config.accounts - Array of account configurations
 * @param {string|number|boolean} [alias] - The alias or index of the account to retrieve.
 *                                         If true or undefined, returns the first account
 * @returns {Object|undefined} The account object if found, undefined otherwise
 */
const getAccount = (config, alias) => {
	if (typeof alias === "boolean" || alias === undefined) {
		return _.first(config.accounts);
	}
	if (typeof alias === "string" && alias.length > 0) {
		const acct = _.find(config.accounts, { account: alias });
		if (acct) {
			return acct;
		}
	}
	const accno = Number.parseInt(alias);
	if (Number.isNaN(accno) || accno.toString() !== alias) {
		return undefined;
	}
	return config.accounts[accno - 1];
};

/**
 * Gets a comma-separated list of account names from the configuration
 *
 * @param {Object} config - The configuration object containing the accounts
 * @param {Array} config.accounts - Array of account configurations
 * @returns {Array<string>} Array of account names
 */
const getAccountNames = (config) => {
	const accounts = config?.accounts;
  if(!accounts) return [];
	if (Array.isArray(accounts)) {
		return _.get(config, "accounts", [])
			.map((acc) => acc.account)
			.toString()
			.split(",")
			.filter(Boolean);
	}
	return Object.keys(accounts);
};

/**
 * Refreshes account filters by loading additional filter definitions from files
 *
 * @param {Object} account - The account configuration to refresh
 * @param {Array<string>} [account.filters] - Array of filter definitions
 * @returns {Promise<Object>} The updated account configuration
 */
const refreshFilters = async (account) => {
	if (account.filters) {
		for (const filter of account.filters) {
			const arf = filter.split(":");
			const filename = path.join(
				process.cwd(),
				process.env.MM_FILTERS_PATH ?? "filters",
				arf.reverse().join("."),
			);
			if (!fs.existsSync(filename)) {
				continue;
			}
			const list = (await fs.promises.readFile(filename, "utf8")).split("\n");
			account[arf[1]] = list.concat(account[arf[1]] ?? []);
		}
	}
	return account;
};

/**
 * Prints account names to the logger in either quiet or verbose mode
 *
 * @param {Object} config - The configuration object containing the accounts
 * @param {Object} options - Command options
 * @param {boolean} options.quiet - Whether to print in quiet mode
 * @param {Object} logger - Logger instance
 * @param {Function} logger.info - Info logging function
 */
const printAccountNames = (config, options, logger) => {
	const field = "account";
	if (options.quiet) {
		logger.info(_.map(config.accounts, field).toString().replace(/,/g, "\n"));
	} else {
		const accounts = _.map(config.accounts, field).toString().split(",");
		let count = 0;
		for (const account of accounts) {
			logger.info(`${count + 1}. ${account}`);
			count++;
		}
	}
};

/**
 * Rounds a date to the nearest minute
 *
 * @param {Date|string|number} date - Date to round
 * @returns {Date} New date object rounded to minutes
 * @throws {Error} If the date is invalid
 */
const roundToMinutes = (date) => {
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) {
		throw new Error("Invalid date");
	}
	return new Date(
		d.getFullYear(),
		d.getMonth(),
		d.getDate(),
		d.getHours(),
		d.getMinutes(),
	);
};

/**
 * Creates an ImapFlow instance for the given account
 *
 * @param {Object} account - Account configuration
 * @param {string} account.host - IMAP server host
 * @param {number} account.port - IMAP server port
 * @param {boolean} [account.tls] - Whether to use TLS
 * @param {string} account.user - Username
 * @param {string} account.password - Encrypted password
 * @param {Object} options - Command options
 * @param {boolean} options.verbose - Enable verbose logging
 * @param {Object} logger - Logger instance
 * @returns {ImapFlow} Configured ImapFlow instance
 */
export function getImapFlow(account, options, logger) {
	return new ImapFlow({
		host: account.host,
		port: account.port,
		secure: account.tls !== false,
		auth: { user: account.user, pass: decrypt(account.password, false) },
		logger: options.verbose ? logger : false,
	});
}

export default {
	getImapFlow,
	getAccount,
	getAccountNames,
	refreshFilters,
	printAccountNames,
	roundToMinutes,
};
