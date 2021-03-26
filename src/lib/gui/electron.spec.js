// import {JSDOM} from 'jsdom';

import spectron from 'spectron';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import path from 'path';
import appConfig from '../../app.config.js';

const Application = spectron.Application;
chai.should();
chai.use(chaiAsPromised);

let app;

function initialiseSpectron() {
    let electronPath = './dist/izel-maps-win32-x64/izel-maps.exe';
    const appPath = path.join(__dirname, "../../dist");

    return new Application({
        path: electronPath,
        args: [appPath],
        env: {
            ELECTRON_ENABLE_LOGGING: true,
            ELECTRON_ENABLE_STACK_DUMPING: true,
            NODE_ENV: "development"
        },
        startTimeout: 20000,
        chromeDriverLogPath: '../chromedriverlog.txt'
    });
}

describe('Application launch', function () {
    this.timeout(10000);

    before(function () {
        app = initialiseSpectron();
        chaiAsPromised.transferPromiseness = app.transferPromiseness;
        return app.start();
    });

    after(function () {
        if (app && app.isRunning()) {
            return app.stop();
        }
    });

    it('shows an initial window', function () {
        return app.client.waitUntilWindowLoaded().getWindowCount().should.eventually.equal(
            appConfig.dev ? 2 : 1
        );
    });
})