import { JSDOM } from "jsdom"
const dom = new JSDOM()
global.document = dom.window.document
global.window = dom.window

import { defaultPresettings } from '@/lib/Presets';
import LsysRenderer from '@/lib/gui/LsysRenderer';
import Midi from '@/lib/MIDI';

const lsysContent = 'C1C4FF[C3+C1F[C3+X]F[C3-X]+X]C4FF[C3-C1F[C3+X]F[C3-X]+X]+C1F[C3+X]F[C3-X]+X';

HTMLCanvasElement.prototype.getContext = () => {
  return {
    translate: () => { },
    fillRect: () => { },
    beginPath: () => { },
    moveTo: () => { },
    lineTo: () => { },
    closePath: () => { },
    stroke: () => { },
    scale: () => { },
  }
};

describe('Inverted angles', () => {
  it('removes silence at the start', () => {
    const midi = new Midi({
      outputMidiPath: 'output.test.mid',
      window,
    });

    const lsysRenderer = new LsysRenderer(
      defaultPresettings,
      document.createElement('canvas'),
      {
        silly: () => { },
        verbose: () => { },
        debug: () => { },
        log: () => { },
        info: () => { },
        warn: () => { },
        error: () => { },
      }
    );

    lsysRenderer.render(lsysContent, midi);
    lsysRenderer.finalise();

    expect(midi.notesContent).not.toBe({ "off": {}, "on": {} });

    midi.createMidiFile(
      midi.notesContent,
      'pentatonic minor',
      300
    );

  });
});
