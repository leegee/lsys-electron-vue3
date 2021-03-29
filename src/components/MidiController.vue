<template>
  <select
    title="MIDI Out"
    id="midi-out"
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

<style scoped>
* {
  color: var(--app-fg);
}
</style>
<script>
import { Vue, Options } from "vue-class-component";

@Options({
  components: {},
})
export default class MidiController extends Vue {
  outputDevicesList = {};
  midiAccess = null;

  async created() {
    this.midiAccess = await navigator.requestMIDIAccess();
    this.midiAccess.onstatechange = (e) =>
      console.warn(e.port.name, e.port.manufacturer, e.port.state);

    const outputDevicesList = {};
    this.midiAccess.outputs.forEach(
      (device) => (outputDevicesList[device.id] = device)
    );
    this.$store.commit("setOutputDevicesList", outputDevicesList);

    this.onMidiOutputDeviceSelected(
      this.$store.state.outputDevicesList[
        Object.keys(this.$store.state.outputDevicesList)[0]
      ].id
    );
  }

  onMidiOutputDeviceSelected(outputDevicesListId) {
    // TODO: send this as a message
    if (this.$store.state.outputDevice) {
      this.$store.state.outputDevice.close();
    }

    this.$store.commit("setOutputDeviceById", outputDevicesListId);
    // this.$store.state.outputDevice.send([command, note, 10]);
  }
}
</script>