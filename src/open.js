import { exec } from "node:child_process";
import chalk from "chalk"

/**
 * Opens the specified email client based on the platform.
 * Currently only supports opening Outlook on Windows and macOS.
 *
 * @param {Object} args - The command arguments
 * @param {string} [args.what='outlook'] - The email client to open
 * @param {Object} options - The command options
 * @param {boolean} [options.verbose] - Enable verbose logging
 * @param {Object} logger - The logger object
 * @param {Function} logger.info - Function to log information
 * @param {Function} logger.error - Function to log errors
 * @returns {Promise<void>}
 *
 */

const LAUNCHERROR = Object.freeze({
	UNSUPPORTED_PLATFORM: "launch not supported on this platform",
	UNSUPPORTED_CLIENT: "Unsupported email client",
});

const launch = {
	outlook: {
		win32: "start outlook",
		darwin: "open -a Microsoft\\ Outlook",
	},
};

export async function openCommand(args, options, logger) {
	const what = args.what ?? "outlook";
	const platform = process.platform;

	if (options.verbose) {
		logger.info(`what: ${what}`);
		logger.info(`platform: ${platform}`);
	}

	try {
		switch (what) {
			case "outlook":
				if (platform === "win32" || platform === "darwin") {
					exec(launch.outlook[platform]);
				} else {
					throw new Error(LAUNCHERROR.UNSUPPORTED_PLATFORM);
				}
				break;
			default:
				throw new Error(LAUNCHERROR.UNSUPPORTED_CLIENT);
		}
	} catch (err) {
		logger.error(chalk.red(err.message));
	}
}
