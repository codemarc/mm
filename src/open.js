import { exec } from "node:child_process"
import util from "./util.js"

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

// =============================================================================
// open command
//
// The open command is used to launch  email related components
// Use mm open --help for more information.
//
// =============================================================================
export async function openCommand(args, options, logger) {
  const u = new util({ args, options, logger })

  const what = args.what ?? u.dv.openCommand
  u.verbose(`what: ${what}`)

  const platform = process.platform
  u.verbose(`platform: ${platform}`)

  try {
    switch (what) {
      case "ou":
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
      case "gm":
      case "gmail":
        if (platform === "win32" || platform === "darwin") {
          exec(launch.gmail[platform])
        } else {
          throw new Error(LAUNCHERROR.UNSUPPORTED_PLATFORM)
        }
        break

      default:
        u.info("\ntry mm open app where app is one of:")
        u.info("   (ou)tlook, (li)nkedin, (gm)ail\n")
    }
  } catch (err) {
    u.error(err)
  }
}
