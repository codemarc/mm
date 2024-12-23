import { exec } from 'node:child_process'


export async function openCommand(args, options, logger) {
  const what = args.what || 'outlook'
  const platform = process.platform

  if (options.verbose) logger.info(`what: ${what}`)
  if (options.verbose) logger.info(`platform: ${platform}`)

  if (what === 'outlook') {
    if (platform === "win32") {
      exec("start outlook")
    } else if (platform === "darwin") {
      exec("open -a Microsoft\\ Outlook")
    } else {
      logger.info("Outlook launch not supported on this platform")
    }
  }
}
