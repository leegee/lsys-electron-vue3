const log = require('electron-log');

log.transports.file.level =
    log.transports.console.level = process.env.LOG_LEVEL || 'silly';

log.transports.console.level = process.env.LOG_LEVEL || 'silly';

// log.transports.console.level = false;

log.transports.console.forceStyles = 1;
log.path = log.transports.file.getFile().path;
log.clear = () => log.transports.file.getFile().clear();

process.stdout.write(
    '---------------------\n' +
    'env.LOG_LEVEL: ' + (process.env.LOG_LEVEL || '') + '\n' +
    'Set file log level: ' + log.transports.file.level + '\n' +
    'Set console log level: ' + log.transports.console.level + '\n' +
    '---------------------\n'
)
process.stdout.write('\nLog file: ' + log.path + '\n');


module.exports = log;

// module.exports = {
//     // ...console,
//     silly: () => { },
//     verbose: () => { },
//     debug: () => { },
//     log: () => { },
//     info: () => console.info,
//     warn: () => console.warn,
//     error: () => console.error,
// };
