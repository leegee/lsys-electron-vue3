var fs = require('fs');
// var MidiWriter = require('midi-writer-js');
var MidiWriter = require('./src/lib/midi-writer-js');

var track = new MidiWriter.Track();

track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1 }));

// With one note, renders one starting at 0
// With two notes, acts as 'with one note'
// With three notes, renders one starting after 0
// With four notes, renders one starting after 0 and lengths the track
// With five notes, acts as 'with four notes'

const events = [
  { duration: "4", pitch: "A3", startTick: 0, velocity: 50 },
  { duration: "4", pitch: "A3", startTick: 200, velocity: 50 },
  // { duration: "4", pitch: "A4", startTick: 400, velocity: 50 },
  // { duration: "4", pitch: "A5", startTick: 600, velocity: 50 },
  // { duration: "4", pitch: "E3", startTick: 154, velocity: 50 },
];

events.forEach(event => {
  var note = new MidiWriter.NoteEvent(event);
  track.addEvent(note);
});

const writer = new MidiWriter.Writer(track);
const data = writer.buildFile();
fs.writeFileSync('midi-writer-test.mid', data);


