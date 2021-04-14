const log = require('electron-log');

log.transports.file.level =
    log.transports.console.level = process.env.LOG_LEVEL || 'error';

log.transports.console.level = process.env.LOG_LEVEL || false;

log.transports.console.level = false;

log.transports.console.forceStyles = 1;

process.stdout.write(
    '---------------------\n' +
    'env.LOG_LEVEL: ' + (process.env.LOG_LEVEL || '') + '\n' +
    'Set file log level: ' + log.transports.file.level + '\n' +
    'Set console log level: ' + log.transports.console.level + '\n' +
    '---------------------\n'
)

log.path = log.transports.file.getFile().path;

process.stdout.write('\nLog file: ' + log.path + '\n');

log.transports.file.getFile().clear();

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
