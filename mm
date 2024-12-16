#!/usr/bin/env node --no-warnings --env-file=.env.local
import pak from "./package.json" assert { type: "json" };
import program from "caporal";
import * as commands from "./src/commands.js";

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
		.action(commands.smash);

	// --------------------------------------------------------------
	// show command
	// --------------------------------------------------------------
	program
		.command("show", "show config")
		.option("-a, --account", "specify account from config")
		.option("-m, --metrics", "show metrics")
    .option("-q, --quiet", "quiet mode")
		.action(commands.show);

	// --------------------------------------------------------------
	// scan command
	// --------------------------------------------------------------
	program
		.command("scan", "scan email folders")
		.option("-a, --account", "specify account from config (default: first loaded)")
    .option("-f, --folder", "specify folder to scan (default: INBOX)",program.STRING, "INBOX",false)
		.option("-l, --limit", "limit number of emails to scan (default: 3)")
		.option("-r, --read", "mark emails as read")
		.option("-s, --skip", "skip number of emails to scan (default: 0)")
		.option("-u, --unread", "only show unread emails")
    .option("-z, --zero", "zero out unread count")
		.action(commands.scan);

	// --------------------------------------------------------------
  // read command
  // --------------------------------------------------------------
  program
    .command("read", "read email")
    .option("-a, --account", "specify account from config (default: first loaded)")
    .option("-u, --unread", "only show unread emails")
    .option("-s, --skip", "skip n scan (default: 0)")
    .argument("[seq]", "sequence number(s) of email to read, comma separated defaults to first found")
    .action(commands.read);

	// program starts to run on this line
	program.parse(process.argv);
} catch (e) {
	console.error(e);
	process.exit(1);
}
