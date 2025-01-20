import chalk from "chalk"
import yaml from "js-yaml"
import fs from "node:fs"
import path from "node:path"
import * as u from "./util.js"
const { dv, error, brief, info, verbose, isAccount } = u

// ----------------------------------------------------------------------------
// explain the smash command
// ----------------------------------------------------------------------------
export async function explain() {
  info(chalk.blueBright("\nThe Smash Command"))
  info(chalk.blueBright("-----------------"))
  info(`The smash command is used to protect sensative data at rest. It runs 
cryptographic operations on your configured accounts. Supply an account 
index or alias or use all to address all accounts. 

    * if --encrypt is used then all passwords in the config file are encrypted
    * if --decrypt is used then all passwords in the config file are decrypted
    
Use mm smash --help for more information.
`)
}

/**
 * ----------------------------------------------------------------------------
 * smash command
 * ----------------------------------------------------------------------------
 */
export async function smashCommand(args, options, logger) {
  const config = u.setInstance({ args, options, logger })
  try {
    if (config == null || isAccount("list")) return

    // an account name or index was passed and it was not "all"
    const account = u.isAccountAll() ? "all" : u.getAccount(config, options.account)
    if (account !== "all") {
      if (!account) {
        error("account not found")
        return
      }
    }

    // if the encrypt and decrypt options are both set then error
    verbose(`options.encrypt=${options.encrypt}`)
    verbose(`options.decrypt=${options.decrypt}`)
    if (options.encrypt && options.decrypt) {
      error("Cannot encrypt and decrypt at the same time")
      return
    }

    // if neither the encrypt or decrypt options are set then error
    if (!(options.encrypt || options.decrypt)) {
      error("No action specified, use --encrypt or --decrypt")
      return
    }

    // run thru all accounts and encrypt or decrypt the passwords
    for (const acct of Object.keys(config)) {
      const account = config[acct]

      brief(`${account}`)
      if ("all" !== options.account && acct !== options.account) {
        continue
      }

      const key = typeof options.encrypt === "string" ? options.encrypt : undefined
      const configFile = path.join(dv.config_path, `${acct}.yml`)

      if (options.encrypt) {
        account.account.password = u.encrypt(account.account.password, key)
        info(`${configFile} encrypted`)
      } else {
        account.account.password = u.decrypt(account.account.password, key)
        info(`${configFile} decrypted`)
      }
      fs.writeFileSync(configFile, yaml.dump(account))
    }
  } catch (err) {
    if (options.verbose) verbose(chalk.red(err.stack))
    else error(err)
  }
}
