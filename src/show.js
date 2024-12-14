import _ from 'lodash';
import cTable from 'console.table';


// Export the show command handler
export const showCommand = async (args, options, logger) => {
    const config = args[0]

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
        logger.info(config)
    }
}

