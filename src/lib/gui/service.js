const fs = require('fs');
const path = require('path');

const log = require('./Logger');
const LsysParametric = require('../LsysParametric');

const start = (args) => {
    const lsys = new LsysParametric({
        ...args,
        logger: log,
        // postRenderCallback: () => {
        //     process.send({ cmd: 'call', methodName: 'serviceDoneGeneration', content: lsys.content });
        // }
    });
    lsys.generate(args.totalGenerations);
    log.info('Service.start finished, calling parent.lsysDone');
    process.send({ cmd: 'call', methodName: 'lsysDone', content: lsys.content });
}

process.on('uncaughtException', error => {
    log.error('CHILD UNCAUGHT EXCEPTION:', error);
    process.send({ cmd: 'error', title: 'Unhandled Error', ...error });
    process.exit(-1);
});

process.on('unhandledRejection', reason => {
    log.log('reason', reason.name + ' ' + reason.message);
    process.send({ cmd: 'error', title: 'Unhandled Rejection', ...reason });
    process.exit(-2);
});

process.on('message', (msg) => {
    log.log('Child got msg', msg);
    switch (msg.cmd) {
        case 'start':
            start(msg);
            break;
        default:
            log.log('unknown command', msg);
    }
});

