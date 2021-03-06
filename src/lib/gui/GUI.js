import url from 'url';
import path from 'path';
import fs from "fs";
import os from 'os';
import cp from 'child_process';
import electron from 'electron';
import { scale } from 'tonal';

import LsysParametric from '../LsysParametric';
import LsysRenderer from './LsysRenderer';
import MIDI from '../MIDI';
import logger from './Logger';
import Presets from '../Presets';
import packageJson from '../../package.json';

const fork = cp.fork;

export default class GUI {
    logger = null;
    logFilePath = null;
    midiFilePath = 'output.mid';
    midi = null;
    canvas = null;
    lsysRenderer = null;
    initialPreset = 0;
    currentViewName = 'viewMain';
    _lastGenerationContent = '';
    settings = {
        // mergeDuplicates: 1,
        duration: 25,
        scale: 'minor pentatonic',
        initialNote: 64,
        canvasWidth: 1000,
        canvasHeight: 800,
        angle: 30,
        xoffset: 0,
        yoffset: 0,
        turtleStepX: 10,
        turtleStepY: 10,
        lineWidth: 10,
        initX: null,
        initY: null,
        backInTime: false,
        canvasBackgroundColour: '#eeeeee',
        opacities: [
            0.8, 0.6, 0.5, 0.4
        ],
        colours: [
            "#825a46",
            "#21b418",
            "#32d232",
            "#46ff46"
        ]
    };

    constructor(options) {
        this.logger = logger;
        this.logFilePath = this.logger.findLogPath();
        this.logger.verbose('Enter new GUI');
        Object.keys(options).forEach(key => {
            this[key] = options[key];
        });

        const { width, height } = electron.remote.screen.getPrimaryDisplay().workAreaSize;
        this.settings.canvasWidth = width;
        this.settings.canvasHeight = height;

        this.win = electron.remote.BrowserWindow.getFocusedWindow();
        this.midi = new MIDI({
            outputMidiPath: this.midiFilePath,
            window
        });
    }

    init() {
        this.window.document.title += ' v' + packageJson.version;
        this.createMenu();

        this.actions = Array.from(
            this.window.document.querySelectorAll('[id^=action]')
        ).reduce((collected, i) => {
            collected[i.id] = i;
            return collected;
        }, {});

        // Settings arrays :(
        this.settings.colours.forEach((value, index) => {
            let el = this.window.document.getElementById('colours-' + index);
            if (!el) throw new Error("Missing HTML element colours-" + index);
            el.setAttribute('value', value);
            el.value = value;
            el = this.window.document.getElementById('opacities-' + index);
            el.setAttribute('value', this.settings.opacities[index]);
            el.value = this.settings.opacities[index];
        });

        // Scales
        const scaleSelect = this.window.document.getElementById('scale');
        scale.names().forEach(name => {
            const option = this.window.document.createElement('option');
            option.innerText = name;
            scaleSelect.appendChild(option);
        });

        this.updateSettings();
        this.createListeners();
        this.loadPreset(this.initialPreset);
        this.view(this.currentViewName);
    }

    createListeners() {
        this.window.document.addEventListener('click', e => {
            if (e.target.id && this.actions[e.target.id]) {
                this[e.target.id]();
                return false;
            }
        }, {
            passive: true
        }
        );

        this.window.document.addEventListener('change', e => {
            this.settingsChanged(e.target);
        }, {
            passive: true
        }
        );
    }

    settingsChanged(el) {
        this.logger.debug('settingChanged', el.nodeName);
        if (el.nodeName === 'INPUT') {
            const matchGroup = el.id.match(/^(\w+)-(\d+)$/);
            if (matchGroup) {
                this.settings[matchGroup[1]][matchGroup[2]] = el.value.trim();
                this.logger.debug('INTPUT el %o changed %s[%d] to %s', matchGroup[1], matchGroup[2], this.settings[matchGroup[1]][matchGroup[2]]);
            }
            else if (el.type === 'checkbox') {
                this.settings[el.id] = el.checked;
            }
            else {
                this.settings[el.id] = el.value.trim();
                this.logger.silly('INPUT el %o changed to %s: ', el.id, this.settings[el.id], el);
            }
        }

        else if (el.nodeName === 'SELECT') {
            this.settings[el.id] = el.value.trim();
            this.logger.silly('Set ', el.id, 'to', el.value);
        }

        else {
            const nodes = el.childNodes;
            let text = '';

            for (let i = 0; i < nodes.length; i++) {
                switch (nodes[i].nodeName) {
                    case '#text': text = text + nodes[i].nodeValue; break;
                    case 'BR': text = text + '\n'; break;
                }
            }

            this.settings[el.id] = text;
            this.logger.silly('INNER TEXT el %s changed to %s: ', el.id, this.settings[el.id], text, el);
        }
    }

    view(viewName) {
        this.logger.debug('Switch view %s to %s', this.currentViewName, viewName)
        try {
            this.logger.silly('Hide:', this.currentViewName);
            if (this.currentViewName) {
                this.elements[this.currentViewName].style.display = 'none';
            }
            this.currentViewName = viewName;
            this.elements[this.currentViewName].style.display = 'block';
            this.elements[this.currentViewName].scrollTo(0, 0);
            this.logger.verbose('Set view to:', this.currentViewName);
        }
        catch (e) {
            this.logger.info('Cannot set view to ' + viewName + ' with elements', this.elements);
            this.logger.error(e);
        }
    }

    modal(viewName) {
        let win = new electron.remote.BrowserWindow({
            parent: this.win,
            modal: true,
            show: false,
            backgroundColor: '#000000',
            width: this.appConfig.gui.modal.width,
            height: this.appConfig.gui.modal.height
        });
        win.setMenu(null);
        win.loadURL(url.format({
            protocol: 'file',
            slashes: true,
            pathname: path.join(__dirname, viewName + '.html')
        }));
        win.once('ready-to-show', () => win.show());
    }

    createMenu() {
        const template = [
            {
                label: '&File',
                submenu: [
                    {
                        label: '&Load Preset',
                        submenu: Presets.map((preset, index) => {
                            return {
                                type: 'radio',
                                label: (index + 1) + ' ' + preset.title,
                                accelerator: index <= 10 ? (index + 1) : undefined,
                                click: (e) => this.loadPreset(index, e)
                            }
                        })
                    },
                    { label: 'P&references', click: () => this.view('viewSettings') },
                    { role: 'separator' },
                    { role: 'quit' }
                ]
            },

            {
                label: 'Ac&tions',
                submenu: [
                    { label: '&Clear Canvases', click: () => this.actionClear() },
                    {
                        label: 'Show &MIDI File',
                        click: () => electron.shell.showItemInFolder(this.midiFilePath)
                    },
                ]
            },

            // { role: 'viewMenu' },

            {
                label: '&Help',
                submenu: [
                    {
                        label: 'Show &Log',
                        click: () => electron.shell.showItemInFolder(this.logFilePath)
                    },
                    {
                        role: 'toggleDevTools'
                    },
                    {

                        label: '&Support',
                        click: () => electron.shell.openExternalSync('https://lee.goddards.space')
                    }
                ]
            },
        ];

        const menu = electron.remote.Menu.buildFromTemplate(template)
        electron.remote.Menu.setApplicationMenu(menu);
    }

    service(cmd, args) {
        this._service = fork(
            path.join(__dirname, 'service'),
            [],
            { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] }
        );

        this._service.on('close', () => this.logger.verbose('child close'));
        this._service.on('exit', () => this.logger.verbose('child exit'));
        this._service.on('error', (err) => {
            this.logger.verbose('child error', err);
            throw err;
        });

        this._service.on('message', msg => {
            switch (msg.cmd) {
                case 'error':
                    this.logger.error(msg);
                    throw new Error((msg.title || 'NO TITLE' + ' ' + msg.name || 'NO_ERROR_NAME') + ' ' + (msg.message || 'NO_ERROR_MESSAGE'));
                case 'call':
                    try {
                        this.logger.log('Try to call', msg.methodName);
                        this[msg.methodName](msg);
                    } catch (e) {
                        if (e.name === 'TypeError') {
                            this.logger.error('MethodName: ', msg.methodName);
                            throw e;
                        }
                    }
                    break;
                default:
                    this.logger.error('Unknown command: ', msg);
            }
        });

        this._service.send({ cmd, ...args });
    }

    updateSettings() {
        Object.keys(this.settings).forEach(id => {
            try {
                this.logger.verbose('Preset set "%s" to "%s"', id, this.settings[id]);
                const el = this.window.document.getElementById(id);
                if (el) {
                    if (el.nodeName) {
                        if (el.nodeName === 'INPUT') {
                            const type = el.getAttribute('type');
                            if (type === 'checkbox') {
                                el.value = 1;
                                if (this.settings[id]) {
                                    if (!el) throw new Error("Missing HTML element (2)");
                                    el.checked = this.settings[id];
                                    el.setAttribute('checked', this.settings[id]);
                                }
                            }
                            else {
                                el.value = this.settings[id];
                            }
                        }
                        else if (el.nodeName === 'SELECT') {
                            el.value = el.selected = this.settings[id];
                        }
                        else {
                            el.innerText = this.settings[id];
                        }
                    }
                    this.settingsChanged(el);
                }
            }
            catch (e) {
                this.logger.error('Could not set ' + id + '.value: missing GUI element?\n', e);
            }
        });
    }

    loadPreset(idx = 0, e) {
        this.logger.info('Load preset ', idx, Presets[idx]);

        if (e) {
            e.checked = true;
        }

        if (!Presets[idx].totalGenerations) {
            this.logger.warn('Preset %d had no value for totalGenerations: using 1.', idx);
            Presets[idx].totalGenerations = 1;
        }

        Object.keys(Presets[idx]).forEach(id => {
            this.settings[id] = Presets[idx][id]
        });

        this.updateSettings();
        this.actionGenerate();
    }

    actionViewMain() {
        this.view('viewMain');
    }

    actionClear() {
        this.elements.canvases.innerText = '';
    }

    actionGenerate(totalGenerations) {
        this.logger.verbose('Enter actionGenerate');
        this._oldActionGenerate = this.elements.actionGenerate.value;
        this.window.document.body.style.cursor = 'progress';
        this.elements.actionGenerate.value = 'Generating...';
        this.elements.actionGenerate.disabled = true;

        this.canvas = this.window.document.createElement('canvas');
        this.elements.canvases.insertBefore(this.canvas, this.elements.canvases.firstChild);

        this.lsysRenderer = new LsysRenderer(this.settings, this.canvas, this.logger);

        this.canvas.scrollIntoView({
            behavior: "smooth",
            block: "end"
        });

        const settings = {
            start: this.settings.start,
            contants: this.settings.contants,
            rules: this.settings.rules,
            totalGenerations: totalGenerations || this.settings.totalGenerations
        }
        this.logger.silly('Call service to start Lsys with', settings);
        this.service('start', settings);
    }

    actionCreateMidi() {
        this.logger.silly('Enter actionCreateMidi');
        this.midi.createMidiFile(
            this.lsysRenderer.notesContent,
            this.settings.scale,
            this.settings.duration
        );
        this.logger.silly('Leave actionCreateMidi');
    }

    openElementInNewWindow(canvas) {
        this.logger.silly('Enter openElementInNewWindow');
        const title = this.settings.totalGenerations + ' generations of ' + this.settings.rules;
        let win = new electron.remote.BrowserWindow({
            parent: this.win,
            show: false,
            titleBar: false,
            title,
            backgroundColor: '#000000',
            width: this.appConfig.gui.openInNewWindow.width,
            height: this.appConfig.gui.openInNewWindow.height
        });
        win.loadURL(canvas.toDataURL());
        win.setMenu(null);
        win.maximize();
        win.once('ready-to-show', () => {
            win.show();
            this.logger.silly('openElementInNewWindow is done');
        });
    }

    // serviceDoneGeneration(content) {
    //     this.logger.info('###########################################\n', content);
    //     const currentGeneration = currentGeneration.substring(
    //         this._lastGenerationContent.length
    //     );
    //     // this.lsysRenderer.render(currentGeneration);
    //     this._lastGenerationContent = currentGeneration;
    // }

    lsysDone({ content }) {
        this.logger.silly('Enter lsysDone with %d byes of content', content.length);
        this.window.document.getElementById('contentDisplay').value = content;
        this.window.document.body.style.cursor = 'default';
        this.elements.actionGenerate.value = this._oldActionGenerate;
        this.elements.actionGenerate.disabled = false;

        this.lsysRenderer.render(content, this.midi);

        this.lsysRenderer.finalise();
        this.canvas.addEventListener('click', (e) => this.openElementInNewWindow(e.target));
        this.actionCreateMidi();
        this.logger.silly('FINISHED lsysDone');
    }

}
