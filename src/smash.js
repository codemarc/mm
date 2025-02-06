import util from "./util.js"
const u = new util()

// =============================================================================
// smash command
//
// The smash command is used to protect sensative data at rest. It runs
// cryptographic operations on your configuration.
//
// if --encrypt is used the config file is encrypted
// if --decrypt is used the config file is decrypted
//
// Use mm smash --help for more information.
//
// =============================================================================
export async function smashCommand(args, options, logger) {
  const config = u.setInstance({ args, options, logger })

  try {
    if (config == null) return

    // if the encrypt and decrypt options are both set then error
    u.verbose(`options.encrypt=${options.encrypt}`)
    u.verbose(`options.decrypt=${options.decrypt}`)
    if (options.encrypt && options.decrypt) {
      u.error("Cannot encrypt and decrypt at the same time")
      return
    }

    // if neither the encrypt or decrypt options are set then error
    if (!(options.encrypt || options.decrypt)) {
      u.error("No action specified, use --encrypt or --decrypt")
      return
    }

    const key = typeof options.encrypt === "string" ? options.encrypt : undefined

    //run thru all accounts and encrypt or decrypt the passwords
    for (const acct of config.accounts) {
      if (options.encrypt) {
        acct.password = u.encrypt(acct.password, key)
      } else {
        acct.password = u.decrypt(acct.password, key)
      }
    }
    u.save(config)
  } catch (err) {
    if (options.verbose) u.verbose(err.stack)
    else u.error(err)
  }
}
