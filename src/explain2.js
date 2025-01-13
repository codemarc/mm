import chalk from "chalk"
import * as u from "./util.js"
import * as commands from "./commands.js"
const { error, info, verbose } = u

// ----------------------------------------------------------------------------
// explain the explain command
// ----------------------------------------------------------------------------
export async function explain() {
  const oc = Object.keys(commands).filter((key) => key !== "run")

  info(chalk.blueBright("\nThe Explain Command"))
  info(chalk.blueBright("---------------------"))
  info(`The explain command is used to explain the usage
of the other commands. It is more about the why then the how.

Try mm explain ${chalk.green(`${oc.join(", ")}`)}
or  mm explain --help for more information.
`)
}

/**
 * ----------------------------------------------------------------------------
 * explain command
 * ----------------------------------------------------------------------------
 */
export async function explainCommand(args, options, logger) {
  try {
    u.setInstance({ options: options, logger: logger })

    if (args.what == null) {
      explain()
      return
    }

    if (commands[args.what]) {
      const { explain: explainit } = await import(`./${args.what}2.js`)
      if (typeof explainit === "function") explainit()
      else error(`${args.what} has no explaination`)
      return
    }
    error(`${args.what} has no explaination`)
  } catch (err) {
    if (options.verbose) verbose(chalk.red(err.stack))
    else error(err)
  }
}
