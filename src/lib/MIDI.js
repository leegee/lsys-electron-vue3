/* Fix this to remove silence at the start:

C1C4FF[C3+C1F[C3+X]F[C3-X]+X]C4FF[C3-C1F[C3+X]F[C3-X]+X]+C1F[C3+X]F[C3-X]+X

*/

import JZZ from "jzz";
import jzzSmf from "jzz-midi-smf";
jzzSmf(JZZ);
import jzzGui from "jzz-gui-player";
jzzGui(JZZ);
import jzzSynth from "jzz-synth-tiny";
jzzSynth(JZZ);
import jzzOsc from "jzz-synth-osc";
jzzOsc(JZZ);
import jzzElectron from "jazz-midi-electron";
jzzElectron(JZZ);

import fs from 'fs';
import { Scale } from 'tonal';
import MidiWriter from 'midi-writer-js';

import Logger from './gui/Logger';
import EventPlayNote from '@/lib/EventPlayNote.js';

Array.prototype.scaleBetween = function (scaledMin, scaledMax) {
    const max = Math.max.apply(Math, this);
    const min = Math.min.apply(Math, this);
    return this.map(num => (scaledMax - scaledMin) * (num - min) / (max - min) + scaledMin);
}

function findNoteRanges(notes) {
    let highestNote = 0;
    let lowestNote = 0;
    let maxNotesInChord = 0;

    Object.keys(notes.on).forEach(index => {
        notes.on[index].forEach(noteValue => {
            if (noteValue >= highestNote) highestNote = noteValue;
            if (noteValue <= lowestNote) lowestNote = noteValue;
        });
        if (notes.on[index].length > maxNotesInChord) {
            maxNotesInChord = notes.on[index].length;
        }
    });
    return [lowestNote, highestNote, maxNotesInChord];
}

export default class MIDI {
    options = {};
    outputs = [];
    outputToUse = 1;
    usePorts = {};
    logger = Logger;

    notesContent = {
        on: {},
        off: {},
    };

    static pitchOffset(lowestNote, highestNote) {
        return Math.floor(
            (127 / 2) - ((Math.abs(highestNote) - Math.abs(lowestNote)) / 2)
        );
    }

    constructor(options = {}) {
        JZZ.synth.Tiny.register('Web Audio');
        JZZ.synth.OSC.register('OSC');

        this.player = new JZZ.gui.Player({
            at: 'player',
            ports: ['OSC', 'Web Audio']
        });

        Object.keys(options).forEach(option => this[option] = options[option]);

        this.logger = this.options.logger || this.logger;

        this.port = JZZ().openMidiOut().or(() => alert('Cannot open output MIDI port.'));
    }

    createMidiFile(notes, scaleName, duration) {
        const scaleOfNoteLetters = Scale.notes('A ' + scaleName);
        this.logger.info('MIDI.createMidiFile: scale notes: ', ...scaleOfNoteLetters);

        this.create(notes, scaleOfNoteLetters, duration);

        if (!fs.existsSync(this.outputMidiPath)) {
            throw new Error('No such file', this.outputMidiPath);
        }

        const data = fs.readFileSync(this.outputMidiPath, 'binary');

        try {
            this.player.stop();
            this.player.load(new JZZ.MIDI.SMF(data));
            // this.player.play();

        } catch (e) {
            this.logger.error(e);
        }
    }

    newRender() {
        this.notesContent = {
            on: {},
            off: {}
        };
    }

    OLD_afterFinalRender() {
        const time2pitch = Object.keys(this.notesContent.on);
        const timeToNoteoff = Object.keys(this.notesContent.off);
        const minT = Math.min(...time2pitch);

        const normalisedPitches = time2pitch; // .scaleBetween(1, 127); // .map(v => v + 12);

        const newOn = {};
        const newOff = {};

        for (let i = 0; i < time2pitch.length; i++) {
            const t = time2pitch[i] - minT;

            newOn[t] = [
                Number(normalisedPitches[i])
            ];
            newOff[t] = [timeToNoteoff[i] - minT + 1];
        }

        this.notesContent.on = newOn;
        this.notesContent.off = newOff;

        this.logger.log('Normalised notes', this.notesContent.on);
    }

    afterFinalRender() {
        const time2pitch = Object.keys(this.notesContent.on);
        const timeToNoteoff = Object.keys(this.notesContent.off);
        const minT = Math.min(...time2pitch);

        const normalisedPitches = time2pitch; // .scaleBetween(1, 127); // .map(v => v + 12);

        const newOn = {};
        const newOff = {};

        for (let i = 0; i < time2pitch.length; i++) {
            const t = time2pitch[i] - minT;

            newOn[t] = [
                Number(normalisedPitches[i])
            ];
            newOff[t] = [timeToNoteoff[i] - minT + 1];
        }

        this.notesContent.on = newOn;
        this.notesContent.off = newOff;

        this.logger.log('Normalised notes', this.notesContent.on);
    }


    addNotes({ startTick, pitchIndex, duration }) {
        startTick = Number(startTick);
        pitchIndex = Number(pitchIndex);

        this.notesContent.on[startTick] = this.notesContent.on[startTick] || [];
        this.notesContent.off[startTick] = this.notesContent.off[startTick] || [];

        this.logger.log('MIDI.addNote: ', pitchIndex, 'dur', duration);

        this.notesContent.on[startTick].push(pitchIndex);
        this.notesContent.off[startTick].push(duration);
    }

    addNotesFromGraph({ x, y }) {
        this.logger.log({ x, y });

        this.notesContent.on[x] = this.notesContent.on[x] || [];
        this.notesContent.off[x] = this.notesContent.off[x] || [];

        this.notesContent.on[x].push(y);
        this.notesContent.off[x].push(1);
    }

    playNote(
        { startTick, pitchIndex, duration }
    ) {
        window.dispatchEvent(new EventPlayNote({ startTick, pitchIndex, duration }));
    }


    /**
    @param {object} notes
    @param {object} notes.on note on values
    @param {object} notes.off note off values
     */
    create(notes, scaleOfNoteLetters, durationScaleFactor) {
        this.logger.silly('MIDI.create---------------->', JSON.stringify(notes, {}, '    '));

        if (!notes) {
            throw new TypeError('No notes supplied to MIDI.create');
        }

        this.logger.silly('durationScaleFactor', durationScaleFactor);
        let minVelocity = 50;

        this.track = new MidiWriter.Track();
        this.track.addInstrumentName('Lsys');

        const [lowestNote, highestNote, maxNotesInChord] = findNoteRanges(notes);

        const velocityScaleFactor = 127 / (127 - minVelocity);

        const pitchOffset = MIDI.pitchOffset(lowestNote, highestNote);

        this.logger.info('Velocity min, scale factor', minVelocity, velocityScaleFactor);
        this.logger.info('Max notes in chord', maxNotesInChord);
        this.logger.info('Pitch offset', pitchOffset);

        let notesRendered = 0;

        Object.keys(notes.on).forEach((startTimeIndex) => {

            if (++notesRendered > 1) {
                // return;
            }

            notes.on[startTimeIndex].forEach((noteValue) => {
                const pitch = Math.abs(pitchOffset + Math.round(noteValue)); // Here fit to scale
                const noteIndex = pitch % scaleOfNoteLetters.length;
                const note = scaleOfNoteLetters[noteIndex];
                const octave = Math.round(pitch / (127 / 8));

                // const startTick = 1 + (Math.ceil((timeOffset + startTimeIndex) * durationScaleFactor));
                // const duration = Math.ceil((notes.off[startTimeIndex][0] + timeOffset) * durationScaleFactor);

                const startTick = Math.ceil(startTimeIndex * 20);
                const duration = 128;

                const noteEvent = {
                    pitch: note + octave,
                    duration: 'T' + duration,
                    startTick,
                    velocity: velocityScaleFactor * minVelocity,
                };

                if (pitch < 128) {
                    this.logger.silly(startTick, noteEvent);
                    this.track.addEvent(new MidiWriter.NoteEvent(noteEvent));
                }
                else {
                    this.logger.error('NOTE OUT OF BOUNDS > 127:', JSON.stringify(noteEvent));
                }
            });
        });

        this.logger.silly('Write MIDI', this.outputMidiPath);

        const writer = new MidiWriter.Writer(this.track);
        const data = writer.buildFile();
        fs.writeFileSync(this.outputMidiPath, data);
        this.logger.log('Wrote MIDI to', this.outputMidiPath);
    }

}