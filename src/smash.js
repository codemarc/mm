import fs from 'node:fs';
import yaml from 'js-yaml';
import chalk from 'chalk';
import crypto from "node:crypto";
const separator = "::";
import path from 'node:path';


// Get the current file's directory
const __configfile = path.join(process.cwd(), 'config.yml');


export const load = (cFile) => {
	let config = {};
	try {
		config = yaml.load(fs.readFileSync(cFile ?? __configfile, "utf8"));
	} catch (e) {
		console.warn(chalk.bgRedBright(`warning: ${e.message}`));
	}
	return config;
};

export const smashCommand = async (args, options, logger) => {
	const config = load();

	if (options.encrypt) {
		// scan thru config and encrypt all passwords
		for (const account of config.accounts) {
			account.password = encrypt(
				account.password,
				typeof options.encrypt === "string" ? options.encrypt : undefined,
			);
		}
		fs.writeFileSync(__configfile, yaml.dump(config));
		logger.info("Encrypted all passwords");
	} else if (options.decrypt) {
		// scan thru config and decrypt all passwords
		for (const account of config.accounts) {
			account.password = decrypt(
				account.password,
				typeof options.decrypt === "string" ? options.decrypt : undefined,
			);
		}
		fs.writeFileSync(__configfile, yaml.dump(config));
		logger.info("Decrypted all passwords");
	} else {
		logger.error("No action specified");
	}
};

/**
 * Encrypts a string using AES-256-CBC encryption
 */
export const encrypt = (string, preseed) => {
	const seed =
		preseed !== undefined && typeof preseed === "string"
			? preseed
			: process.env.MM_CRYPTOKEY;
	if (!seed) throw new Error("No seed provided");
	const key = crypto
		.createHash("sha256")
		.update(seed)
		.digest("hex")
		.slice(16, 48);

	const rando = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv("aes-256-cbc", key, rando);
	let encryptedString = cipher.update(string);
	encryptedString = Buffer.concat([encryptedString, cipher.final()]);
	return rando.toString("hex") + separator + encryptedString.toString("hex");
};

/**
 * Decrypts an AES-256-CBC encrypted string
 */
export const decrypt = (string, preseed) => {
	const seed =
		preseed !== undefined && typeof preseed === "string"
			? preseed
			: process.env.MM_CRYPTOKEY;
	if (!seed) throw new Error("No seed provided");
	const key = crypto
		.createHash("sha256")
		.update(seed)
		.digest("hex")
		.slice(16, 48);
	try {
		const split = string.split(separator);
		const iv = Buffer.from(split[0], "hex");
		split.shift();
		const encryptedText = Buffer.from(split.join(separator), "hex");
		const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
		let decrypted = decipher.update(encryptedText);
		decrypted = Buffer.concat([decrypted, decipher.final()]);
		return decrypted.toString();
	} catch (e) {
		throw new Error(`Decryption failed: ${e.message}\n`);
	}
};
