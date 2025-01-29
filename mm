#!/usr/bin/env node --no-warnings --env-file=.env.local

import program from "caporal"
import * as commands from "./src/commands.js"
import util from "./src/util.js"

const u = new util(program.logger)
const { name, version, description } = u.getPak()

try {
  const mm = name.slice(name.indexOf("/") + 1)
  program.name(mm)
  program.version(version)
  program.description(description)

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

  // --------------------------------------------------------------
  // clean command
  // --------------------------------------------------------------
  program
    .command("clean", "clean up mailboxes")
    .argument("[account]", `specify account from config (defaults: ${u.dv.accountAlias})`)
    .option("-a, --all", "select all accounts active or not")
    .option("-b, --brief", "brief/minimal output")
    .option("-q, --quiet", "quiet mode")
    .option("-v, --verbose", "verbose mode")
    .action(commands.clean)

  program.parse(process.argv)
} catch (e) {
  console.error(e)
  process.exit(1)
}
