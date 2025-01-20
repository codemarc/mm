import chalk from "chalk"
import { exec } from "node:child_process"
import { dv, error, info, verbose, setInstance } from "./util.js"

const LAUNCHERROR = Object.freeze({
  UNSUPPORTED_PLATFORM: "launch not supported on this platform",
  UNSUPPORTED_CLIENT: "done know what that is"
})

const launch = {
  outlook: {
    win32: "start outlook",
    darwin: "open -a Microsoft\\ Outlook"
  },
  gmail: {
    win32: "start chrome https://mail.google.com",
    darwin: "open https://mail.google.com"
  },
  linkedin: {
    win32: "start https://www.linkedin.com",
    darwin: "open https://www.linkedin.com"
  }
}

export async function openCommand(args, options, logger) {
  setInstance({ options: options, logger: logger })

  const what = args.what ?? dv.openCommand
  verbose(`what: ${what}`)

  const platform = process.platform
  verbose(`platform: ${platform}`)

  try {
    switch (what) {
      case "explain":
        explain()
        break

      case "outlook":
        if (platform === "win32" || platform === "darwin") {
          exec(launch.outlook[platform])
        } else {
          throw new Error(LAUNCHERROR.UNSUPPORTED_PLATFORM)
        }
        break
      case "li":
      case "linkedin":
        if (platform === "win32" || platform === "darwin") {
          exec(launch.linkedin[platform])
        } else {
          throw new Error(LAUNCHERROR.UNSUPPORTED_PLATFORM)
        }
        break
      case "gmail":
        if (platform === "win32" || platform === "darwin") {
          exec(launch.gmail[platform])
        } else {
          throw new Error(LAUNCHERROR.UNSUPPORTED_PLATFORM)
        }
        break

      default:
        info("\ntry mm open app where app is one of:")
        info(chalk.green("   outlook, (li)nkedin, gmail\n"))
    }
  } catch (err) {
    error(err)
  }
}

// ----------------------------------------------------------------------------
// explain the open command
// ----------------------------------------------------------------------------
const explain = () => {
  info(chalk.blueBright("\nThe Open Command"))
  info(chalk.blueBright("----------------"))
  info(`The open command launches the default app for the platform. 
You can also specify the app to launch by passing the app name as an argument.
    
  * if you pass no arguments then the command launches the default 
    app as specified by the MM_DEFAULT_APP environment variable
  * to see available commands pass the the word 'list'

try mm open --help for more information
`)
}
