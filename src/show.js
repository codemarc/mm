import _ from 'lodash';
import cTable from 'console.table';
import { load,decrypt } from './smash.js';
import { ImapFlow } from 'imapflow';


// Export the show command handler
export const showCommand = async (args, options, logger) => {
    const config = load()

    if (options.account) {
        if(typeof options.account === 'string' && options.account.length > 0) {

            const account = _.find(config.accounts, { account: options.account })
            if (account) {
                logger.info(account)
            } else {
                logger.error(`Account ${options.account} not found`)
            }
        } else {
            if (options.quiet) {
                logger.info(_.map(config.accounts, 'account').toString().replace(/,/g, '\n'))
            } else {

                const headers = ['account', 'user', 'host','port']  
                const values = _.map(config.accounts, (obj) => _.pick(obj,headers))
                logger.info(cTable.getTable(values))
            }
        }
    } else {
        if (options.metrics) {

          const metrics = await Promise.all(_.map(config.accounts, async (account) => {
            const client = new ImapFlow({host: account.host,port: account.port,secure: account.tls !== false,auth: {user: account.user,pass: decrypt(account.password, false),},logger: false,});
            try {
              await client.connect();
              const lock = await client.getMailboxLock('INBOX');
              const unread = await client.search({ unseen: true })
              const total = await client.search({ all: true })
              lock.release();
              return {
                account: account.account,
                blacklist: account.blacklist.length.toLocaleString(),
                unread: unread.length.toLocaleString(),
                total: total.length.toLocaleString()
              }
            } catch (error) {
                logger.error(error)
            } finally {
              await client.logout();
            }
          }))
          logger.info(cTable.getTable(metrics))

        } else {
          if (options.verbose) {
            logger.info(config)
          } else {
             logger.info(_.map(config.accounts, 'account').toString().replace(/,/g, '\n'))
          }
        }
    }
}

