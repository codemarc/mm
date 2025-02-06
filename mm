#!/usr/bin/env node --no-warnings --env-file=.env.local

import program from "caporal"
import * as commands from "./src/commands.js"
import util from "./src/util.js"

const u = new util(program.logger)
const { name, version, description } = u.getPak()
const { scanLimit } = u.dv

try {
  const mm = name.slice(name.indexOf("/") + 1)
  program.name(mm)
  program.version(version)
  program.description(description)

  // --------------------------------------------------------------
  // clean command
  // --------------------------------------------------------------
  program
    .command("clean", "clean up mailboxes")
    .argument("[account]", "specify account from config")
    .option("-a, --all", "select all accounts active or not")
    .option("-b, --brief", "brief/minimal output")
    .option("-q, --quiet", "quiet mode")
    .option("-v, --verbose", "verbose mode")
    .action(commands.clean)

  // --------------------------------------------------------------
  // scan command
  // --------------------------------------------------------------
  program
    .command("scan", "scan email using rules")
    .argument("[account]", "specify account from config")
    .option("-a, --all", "select all accounts active or not")
    .option("-d, --date", "specify date to scan (default: today)")
    .option("-f, --folder", "specify folder to scan (default: INBOX)")
    .option("-l, --limit", `limit number of emails to scan (default: ${scanLimit})`)
    .option("-r, --ruleset", "processs ruleset")
    .option("-s, --skip", "skip number of emails to scan (default: 0)")
    .option("-u, --unread", "only show unread emails")
    .option("-t, --tagged", "only show tagged/flagged emails")
    .option("-b, --brief", "brief/minimal output")
    .option("-q, --quiet", "quiet mode")
    .option("-v, --verbose", "verbose mode")
    .action(commands.scan)

  // --------------------------------------------------------------
  // smash command
  // --------------------------------------------------------------
  program
    .command("smash", "encrypt/decrypt secrets")
    .argument("[account]", "specify account from config (defaults to all)")
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
    .argument("[what]", "specify app to run (? file the list)")
    .option("-b, --brief", "brief/minimal output")
    .option("-q, --quiet", "quiet mode")
    .option("-v, --verbose", "verbose mode")
    .action(commands.open)

  program.parse(process.argv)
} catch (e) {
  console.error(e)
  process.exit(1)
}
