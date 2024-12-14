#!/usr/bin/env node --no-warnings --env-file=.env.local
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pak  from "./package.json" assert { type: 'json' }
import program from 'caporal';
import yaml from 'js-yaml';
import chalk from 'chalk';  
import _ from 'lodash';
import { showCommand } from './src/show.js';
import { encrypt, decrypt } from './src/smash.js';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __configfile = path.join(__dirname, 'config.yml')

let config = {}
try{
    config = yaml.load(fs.readFileSync(__configfile, 'utf8'));
} catch (e) {
    console.warn(chalk.bgRedBright(`warning: ${e.message}`));
}

try {
    program.name(pak.name)
    program.version(pak.version)
    program.description(pak.description)

    program.command('smash', 'encrypt/decrypt secrets')
    .option('-e, --encrypt', 'encrypt secrets')
    .option('-d, --decrypt', 'decrypt secrets')
    .action(async (args, options, logger) => {

        if(options.encrypt) {
            // scan thru config and encrypt all passwords
            for(const account of config.accounts) {
                account.password = encrypt(account.password, typeof options.encrypt === 'string' ? options.encrypt : undefined)
            }
            fs.writeFileSync(__configfile, yaml.dump(config))
            logger.info('Encrypted all passwords')

        } else if(options.decrypt) {
            // scan thru config and decrypt all passwords
            for(const account of config.accounts) {
                account.password = decrypt(account.password, typeof options.decrypt === 'string' ? options.decrypt : undefined)
            }
            fs.writeFileSync(__configfile, yaml.dump(config))
            logger.info('Decrypted all passwords')

        } else {
            logger.error('No action specified')
        }
    })  

    program.command('show', 'show config')
    .option('-a, --account', 'specify account from config')
    .option('-q, --quiet', 'quiet mode')
    .action(async (args, options, logger) => {
        args[0]=config
        showCommand(args, options, logger)
    })

    program.command('scan', 'scan email folders')
    .option('-a, --account', 'specify account from config (default: all)')
    .action(async (args, options, logger) => {
        logger.info('scanning email folders')
    })

    program.parse(process.argv)
    
} catch (e) {
    console.error(e);
    process.exit(1);
}



