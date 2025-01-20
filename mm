#!/usr/bin/env node --no-warnings --env-file=.env.local

import program from "caporal"
import * as commands from "./src/commands.js"
import { dv } from "./src/util.js"
const { name, version, description } = dv.pak

try {
  const mm = name.slice(name.indexOf("/") + 1)
  program.name(mm)
  program.version(version)
  program.description(description)

  // --------------------------------------------------------------
  // scan command
  // --------------------------------------------------------------
  program
    .command("scan", "scan email using rules")
    .argument("[account]", `specify account from config (defaults: ${dv.accountAlias})`)
    .option("-a, --all", "select all accounts active or not")
    .option("-d, --date", "specify date to scan (default: today)")
    .option("-f, --folder", "specify folder to scan (default: INBOX)")
    .option("-l, --limit", `limit number of emails to scan (default: ${dv.scanLimit})`)
    .option("-r, --ruleset", "processs ruleset")
    .option("-s, --skip", "skip number of emails to scan (default: 0)")
    .option("-u, --unread", "only show unread emails")
    .option("-t, --tagged", "only show tagged/flagged emails")
    .option("-b, --brief", "brief/minimal output")
    .option("-q, --quiet", "quiet mode")
    .option("-v, --verbose", "verbose mode")
    .action(commands.scan)

  // --------------------------------------------------------------
  // show command
  // --------------------------------------------------------------
  program
    .command("show", "show configuration")
    .argument("[account]", "specify account from config (defaults to all)")
    .option("-a, --all", "select all accounts active or not")
    .option("-f, --folder", "show folders")
    .option("-b, --brief", "brief/minimal output")
    .option("-q, --quiet", "quiet mode")
    .option("-v, --verbose", "verbose mode")
    .action(commands.show)

  // --------------------------------------------------------------
  // clean command
  // --------------------------------------------------------------
  program
    .command("clean", "clean up mailboxes")
    .argument("[account]", `specify account from config (defaults: ${dv.accountAlias})`)
    .option("-a, --all", "select all accounts active or not")
    .option("-b, --brief", "brief/minimal output")
    .option("-q, --quiet", "quiet mode")
    .option("-v, --verbose", "verbose mode")
    .action(commands.clean)

  // --------------------------------------------------------------
  // delete command
  // --------------------------------------------------------------
  program
    .command("delete", "delete email")
    .argument("[account]", `specify account from config (defaults: ${dv.accountAlias})`)
    .option("-a, --all", "select all accounts active or not")
    .option("-f, --folder", "move content of the named folder to trash")
    .option("-i, --index", "index(s) of email to delete, comma separated, `:` for a range")
    .option("-s, --seqno", "seqno(s) of email to delete, comma separated, `:` for a range")
    .option("-b, --brief", "brief/minimal output")
    .option("-q, --quiet", "quiet mode")
    .option("-v, --verbose", "verbose mode")
    .action(commands.delete)

  // --------------------------------------------------------------
  // smash command
  // --------------------------------------------------------------
  program
    .command("smash", "encrypt/decrypt secrets")
    .argument("[account]", "specify account from config (defaults to all)")
    .option("-a, --all", "select all accounts active or not")
    .option("-e, --encrypt", "encrypt secrets")
    .option("-d, --decrypt", "decrypt secrets")
    .option("-b, --brief", "brief/minimal output")
    .option("-q, --quiet", "quiet mode")
    .option("-v, --verbose", "verbose mode")
    .action(commands.smash)

  // --------------------------------------------------------------
  // open command
  // --------------------------------------------------------------
  program
    .command("open", "open specified app")
    .argument("[what]", "specify app to run (defaults to outlook)")
    .option("-b, --brief", "brief/minimal output")
    .option("-q, --quiet", "quiet mode")
    .option("-v, --verbose", "verbose mode")
    .action(commands.open)

  // --------------------------------------------------------------
  // explain command
  // --------------------------------------------------------------
  program
    .command("explain", "explains the use case for the command")
    .argument("[what]", "specify what command you want to explain")
    .option("-b, --brief", "brief/minimal output")
    .option("-q, --quiet", "quiet mode")
    .option("-v, --verbose", "verbose mode")
    .action(commands.explain)

  program.parse(process.argv)
} catch (e) {
  console.error(e)
  process.exit(1)
}
