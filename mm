#!/usr/bin/env node --no-warnings --env-file=.env.local
import pak from "./package.json" assert { type: "json" };
import program from "caporal";
import * as commands from "./src/commands.js";
import { dv } from "./src/util.js"

try {
  program.name(pak.name);
  program.version(pak.version);
  program.description(pak.description);

  // --------------------------------------------------------------
  // show command
  // --------------------------------------------------------------
  program
    .command("show", "show configuration")
    .argument("[account]", "specify account from config (defaults to all)")
    .option("-c, --counts", "show message counts")
    .option("-f, --folder", "show folder or  counts")
    .option("-l, --list", "show all accounts")
    .option("-q, --quiet", "quiet mode")
    .option("-v, --verbose", "verbose mode")
    .action(commands.show);

  // --------------------------------------------------------------
  // scan command
  // --------------------------------------------------------------
  program
    .command("scan", "scan email folders")
    .argument("[account]", `specify account from config (defaults: ${dv.accountAlias})`)
    .argument("[limit]", `limit number of emails to scan (default: ${dv.scanLimit})`)
    .option("-a, --archive", "specify archive folder, (default: All Mail or Archive)")
    .option("-f, --folder", "specify folder to scan (default: INBOX)")
    .option("-g, --archive", "specify archive folder, (default: All Mail or Archive)")
    .option("-l, --limit", `limit number of emails to scan (default: ${dv.scanLimit})`)
    .option("-q, --quiet", "quiet mode")
    .option("-r, --read", "mark emails as read")
    .option("-s, --skip", "skip number of emails to scan (default: 0)")
    .option("-u, --unread", "only show unread emails")
    .option("-v, --verbose", "verbose mode")
    .option("-z, --zero", "zero out unread count")
    .action(commands.scan);

  // --------------------------------------------------------------
  // delete command
  // --------------------------------------------------------------
  program
    .command("delete", "delete email")
    .argument("[account]", "specify account from config (defaults to all)")
    .option("-f, --folder", "move content of the named folder to trash")
    .option("-i, --index", "index(s) of email to delete, comma separated, `:` for a range")
    .option("-s, --seqno", "seqno(s) of email to delete, comma separated, `:` for a range")
    .option("-q, --quiet", "quiet mode")
    .option("-v, --verbose", "verbose mode")
    .action(commands.delete);

  // --------------------------------------------------------------
  // clean command
  // --------------------------------------------------------------
  program.command("clean", "clean up mailboxes")
    .argument("[account]", "specify account from config (defaults to all)")
    .option("-q, --quiet", "quiet mode")
    .option("-v, --verbose", "verbose mode")
    .action(commands.clean);

  // --------------------------------------------------------------  
  // open command
  // --------------------------------------------------------------
  program.command("open", "open mail")
    .argument("[what]", "specify mail progrm to run (defaults to outlook)")
    .option("-v, --verbose", "verbose mode")
    .action(commands.open);

  // --------------------------------------------------------------
  // smash command
  // --------------------------------------------------------------
  program
    .command("smash", "encrypt/decrypt secrets")
    .option("-e, --encrypt", "encrypt secrets")
    .option("-d, --decrypt", "decrypt secrets")
    .action(commands.smash);

  // todo: decide if we want to keep this
  // --------------------------------------------------------------
  // read command
  // --------------------------------------------------------------
  // program
  //   .command("read", "read email")
  //   .option("-a, --account", "specify account from config (default: first loaded)")
  //   .option("-u, --unread", "only show unread emails")
  //   .option("-s, --skip", "skip n scan (default: 0)")
  //   .argument("[seq]", "sequence number(s) of email to read, comma separated defaults to first found")
  //   .action(commands.read);


  if (process.argv.length < 3) {
    process.argv.push('-h')
  }

  program.parse(process.argv);
} catch (e) {
  console.error(e);
  process.exit(1);
}
