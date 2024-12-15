#!/usr/bin/env node --no-warnings --env-file=.env.local
import pak from "./package.json" assert { type: "json" };
import program from "caporal";
import { showCommand  } from "./src/show.js";
import { smashCommand } from "./src/smash.js";
import { scanCommand } from "./src/scan.js";

try {
	program.name(pak.name);
	program.version(pak.version);
	program.description(pak.description);

	// --------------------------------------------------------------
	// smash command
	// --------------------------------------------------------------
	program
		.command("smash", "encrypt/decrypt secrets")
		.option("-e, --encrypt", "encrypt secrets")
		.option("-d, --decrypt", "decrypt secrets")
		.action(smashCommand);

	// --------------------------------------------------------------
	// show command
	// --------------------------------------------------------------
	program
		.command("show", "show config")
		.option("-a, --account", "specify account from config")
		.option("-q, --quiet", "quiet mode")
		.action(showCommand);

	// --------------------------------------------------------------
	// scan command
	// --------------------------------------------------------------
	program
		.command("scan", "scan email folders")
		.option("-a, --account", "specify account from config (default: first loaded)")
		.option("-s, --skip", "skip number of emails to scan (default: 0)")
		.option("-l, --limit", "limit number of emails to scan (default: 3)")
		.option("-r, --read", "mark emails as read")
		.action(scanCommand);


	// program starts to run on this line
	program.parse(process.argv);
} catch (e) {
	console.error(e);
	process.exit(1);
}
