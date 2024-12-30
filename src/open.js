import { exec } from "node:child_process"
import { setInstance, verbose, error } from "./util.js"

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

  const what = args.what ?? "outlook"
  verbose(`what: ${what}`)

  const platform = process.platform
  verbose(`platform: ${platform}`)

  try {
    switch (what) {
      case "outlook":
        if (platform === "win32" || platform === "darwin") {
          exec(launch.outlook[platform])
        } else {
          throw new Error(LAUNCHERROR.UNSUPPORTED_PLATFORM)
        }
        break
      case "li":
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
        throw new Error(LAUNCHERROR.UNSUPPORTED_CLIENT)
    }
  } catch (err) {
    error(err)
  }
}
