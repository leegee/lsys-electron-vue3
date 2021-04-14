<template>
  <select
    id="midi-out"
    title="MIDI Out"
    @select="onMidiOutputDeviceSelected($event.target.value)"
  >
    <optgroup label="MIDI Ou:">
      <option
        v-for="device in $store.state.outputDevicesList"
        :key="device"
        value="device.id"
      >
        {{ device.name + " (" + device.state + ")" }}
      </option>
    </optgroup>
  </select>
</template>

<script>
import { Vue, Options } from "vue-class-component";
import { Watch } from "vue-property-decorator";
import { EVENT_NAME } from "@/lib/EventPlayNote.js";

const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;

// function frequencyFromNoteNumber(note) {
//   return 440 * Math.pow(2, (note - 69) / 12);
// }

const logArgs = () => {};

@Options({
  components: {},
})
export default class MidiController extends Vue {
  outputDevicesList = {};
  midiAccess = null;
  connection = null; // : MIDIConnectionEvent

  @Watch("connection")
  onConnection() {
    this.sendNote(60);
  }

  mounted() {
    window.addEventListener(EVENT_NAME, logArgs);
  }

  unmounted() {
    window.removeEventListener(EVENT_NAME, logArgs);
  }

  async created() {
    const permissionStatus = await navigator.permissions.query({
      name: "midi",
    });
    permissionStatus.onchange = () => console.log(permissionStatus.state);
    console.log("Midi permissions", permissionStatus.state);
    if (permissionStatus.state !== "granted") {
      throw new Error("No MIDI permissions");
    }

    this.midiAccess = await navigator.requestMIDIAccess();

    this.midiAccess.onstatechange = (e) => {
      console.warn(e, e.port.name, e.port.state);
      if (e instanceof MIDIConnectionEvent) {
        this.connection = e;
      }
    };

    const outputDevicesList = {};
    this.midiAccess.outputs.forEach((device) => {
      outputDevicesList[device.id] = device;
      console.info("Device", device);
    });
    this.$store.commit("setOutputDevicesList", outputDevicesList);

    const firstListedDevice = this.$store.state.outputDevicesList[
      Object.keys(this.$store.state.outputDevicesList)[0]
    ];
    this.onMidiOutputDeviceSelected(firstListedDevice.id);
  }

  onMidiOutputDeviceSelected(outputDevicesListId) {
    this.$store.commit("setOutputDeviceById", outputDevicesListId);
  }

  sendNote(pitch = 60, velocity = 0x40, durationMs = 1200.0) {
    console.log(
      "send note: Device/pitch/vel/dur",
      this.$store.state.outputDevice,
      pitch,
      velocity,
      durationMs
    );
    this.$store.state.outputDevice.send([NOTE_ON, pitch, velocity]);
    this.$store.state.outputDevice.send([NOTE_OFF, pitch, velocity]);
    this.$store.state.outputDevice.send(
      [NOTE_OFF, pitch, velocity],
      window.performance.now() + durationMs
    );
    console.log("sent note");
  }
}
</script>

<style scoped>
* {
  color: var(--app-fg);
}
</style>
