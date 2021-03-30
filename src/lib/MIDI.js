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

    playFile(notes, scaleName, duration) {
        const scaleOfNoteLetters = Scale.notes('A ' + scaleName);
        this.logger.info('SCALE NOTES: ', scaleOfNoteLetters);

        this.create(notes, scaleOfNoteLetters, duration);

        if (!fs.existsSync(this.outputMidiPath)) {
            throw new Error('No such file', this.outputMidiPath);
        }

        const data = fs.readFileSync(this.outputMidiPath, 'binary');
        try {
            const smf = new JZZ.MIDI.SMF(data);
            this.player.stop();
            this.player.load(smf);
            this.player.play();
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

    afterFinalRender() {
        const time2pitch = Object.keys(this.notesContent.on);
        const timeToNoteoff = Object.keys(this.notesContent.off);
        const minT = Math.min(...time2pitch);

        // todo stop wrapping if unncessary
        // console.log(
        //     Object.keys(this.notesContent.on).map(_ => this.notesContent.on[_])
        // );

        const normalised = time2pitch.scaleBetween(20, 108).map(v => v + 20);

        const newOn = {};
        const newOff = {};

        for (let i = 0; i < time2pitch.length; i++) {
            this.notesContent.on[time2pitch[i]] = [normalised[i]];
            newOn[time2pitch[i] - minT] = [normalised[i]];
            newOff[time2pitch[i] - minT] = [timeToNoteoff[i] - minT];
        }

        this.notesContent.on = newOn;
        this.notesContent.off = newOff;
    }


    addNotes({ startTick, pitchIndex, duration }) {
        this.notesContent.on[startTick] = this.notesContent.on[startTick] || [];
        this.notesContent.off[startTick] = this.notesContent.off[startTick] || [];

        this.notesContent.on[startTick].push(pitchIndex);
        this.notesContent.off[startTick].push(duration);

        // Need a way to render a whole generation to preserve the polyphony created by branches?
        this.playNote({
            startTick, pitchIndex, duration
        });
    }

    playNote(
        { startTick, pitchIndex, duration }
    ) {
        console.info('Real Time PLAY NOTE: ', { startTick, pitchIndex, duration });
    }



    /**
    @param {object} notes
    @param {object} notes.on note on values
    @param {object} notes.off note off values
     */
    create(notes, scaleOfNoteLetters, durationScaleFactor) {
        this.logger.silly('create---------------->', JSON.stringify(notes, {}, '    '));
        this.logger.silly('durationScaleFactor', durationScaleFactor);
        let minVelocity = 50;
        let highestNote = 0;
        let lowestNote = 0;
        let maxNotesInChord = 0;

        this.track = new MidiWriter.Track();

        Object.keys(notes.on).forEach(index => {
            notes.on[index].forEach(noteValue => {
                if (noteValue >= highestNote) highestNote = noteValue;
                if (noteValue <= lowestNote) lowestNote = noteValue;
            });
            if (notes.on[index].length > maxNotesInChord) {
                maxNotesInChord = notes.on[index].length;
            }
        });

        // notes.on.map( i =>

        const velocityScaleFactor = 127 / (127 - minVelocity);
        this.logger.silly('VELOCITY min/max notes/factor', minVelocity, maxNotesInChord, velocityScaleFactor);

        const pitchOffset = 1; //  MIDI.pitchOffset(lowestNote, highestNote);
        // this.logger.silly('PITCH OFFSET', pitchOffset);

        let timeOffset = Math.min(...Object.keys(notes.on));
        if (timeOffset < 0) {
            timeOffset = Math.ceil(Math.abs(timeOffset));
        } else {
            timeOffset = 0;
        }
        this.logger.info('Time Offset', timeOffset);

        Object.keys(notes.on).forEach((startTimeIndex) => {
            const chordToPlay = {};

            notes.on[startTimeIndex].forEach((noteValue) => {
                const pitch = pitchOffset + Math.round(noteValue); // Here fit to scale
                const noteIndex = Math.abs(pitch) % scaleOfNoteLetters.length;
                const note = scaleOfNoteLetters[noteIndex];
                const octave = Math.round(Math.abs(pitch) / (127 / 8));
                this.logger.silly({ startTimeIndex, pitchOffset, pitch, noteIndex, note, octave, durationScaleFactor, timeOffset });

                const noteEvent = {
                    pitch: note + octave,
                    duration: 'T' + Math.ceil((notes.off[startTimeIndex][0] + timeOffset) * durationScaleFactor),
                    velocity: Math.ceil((Object.keys(chordToPlay).length * velocityScaleFactor) + minVelocity),
                    startTick: Math.ceil((timeOffset + startTimeIndex) * durationScaleFactor)
                };
                this.logger.silly(noteEvent);

                if (pitch <= 127) {
                    this.track.addEvent(new MidiWriter.NoteEvent(noteEvent));
                } else {
                    this.logger.error('NOTE OUT OF BOUNDS > 127:', JSON.stringify(noteEvent));
                }
            });
        });

        this.logger.log('Write', this.outputMidiPath);
        const writer = new MidiWriter.Writer(this.track);
        const data = writer.buildFile();
        fs.writeFileSync(this.outputMidiPath, data);
        this.logger.log('Written');
    }

}