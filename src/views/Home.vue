<template>
  <section :class="{ working: working === true }">
    <form>
      <div class="column">
        <fieldset>
          <legend>{{ settings.title || "L-system" }}</legend>
          <p>
            <label title="#define name value"
              >Constants
              <textarea id="variables" v-model="settings.variables" />
            </label>
          </p>

          <p>
            <label title="F(x,y): x==1 && y==2 => NewPattern">Rules </label>
            <textarea id="rules" v-model="settings.rules" />
          </p>

          <p>
            <label
              >Axiom<input id="start" v-model="settings.start" type="text" />
            </label>
          </p>

          <p>
            <label
              >Branch Angle
              <input
                id="angle"
                v-model="settings.angle"
                type="range"
                min="0"
                max="360"
                aria-valuemin="0"
                aria-valuemax="360"
              />
            </label>

            <label
              >Generations
              <input
                id="totalGenerations"
                v-model="settings.totalGenerations"
                type="range"
                min="1"
                max="10"
                aria-valuemin="1"
                aria-valuemax="10"
              />
            </label>
          </p>
        </fieldset>
      </div>

      <div class="column">
        <fieldset>
          <legend>MIDI</legend>
          <!-- <p>
            <label
              >Allow notes to be placed back in the past?
              <input
                id="backInTime"
                v-model="settings.backInTime"
                type="checkbox"
              />
            </label>
          </p> -->

          <p>
            <label
              >Note duration
              <input
                id="duration"
                v-model="settings.duration"
                type="range"
                min="1"
                max="50"
                step="0.5"
              />
            </label>

            <label
              >Wrap Angle
              <input
                disabled
                id="wrapAtAngle"
                v-model="settings.wrapAtAngle"
                type="range"
                min="0"
                max="360"
                aria-valuemin="0"
                aria-valuemax="360"
              />
            </label>

            <!-- <label>Initial note <input type='range' min=0 max=127 step=1 value="64" id='initialNote'>
                                </label> -->
          </p>

          <p>
            <label
              >Scale
              <select v-model="settings.scale">
                <option
                  v-for="option in scales.names()"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
            </label>
          </p>

          <div id="player" />
        </fieldset>

        <fieldset>
          <legend>Output</legend>
          <textarea id="contentDisplay" v-model="settings.contentDisplay" />
        </fieldset>

        <!-- <MidiController /> -->
      </div>
    </form>

    <div id="canvases" ref="canvases" />
  </section>
</template>

<script>
import { Vue, Options } from "vue-class-component";
import { ipcRenderer } from "electron";

import Midi from "@/lib/MIDI";
import Presets, { defaultPresettings } from "@/lib/Presets";
import { scale as tonalScales } from "tonal";
import Logger from "@/lib/gui/Logger";
import LsysParametric from "@/lib/LsysParametric";
import LsysRenderer from "@/lib/gui/LsysRenderer";
import MidiController from "@/components/MidiController";

@Options({
  components: {
    MidiController,
  },
})
export default class Home extends Vue {
  midi = null;
  settings = {};
  scales = tonalScales;
  midiFilePath = "output.mid";
  working = false;
  lsys = null;
  logger = Logger;

  mounted() {
    ipcRenderer.on("load-preset", (_event, presetIndex) => {
      this.loadPreset(presetIndex);
    });

    ipcRenderer.on("generate-all", () => {
      this.generateAll();
    });

    ipcRenderer.on("generate-midi", () => {
      this.generateMidi();
    });

    ipcRenderer.on("clear-canvases", () => {
      this.$refs.canvases.innerHTML = "";
    });

    this.midi = new Midi({
      window,
      outputMidiPath: this.midiFilePath,
      logger: this.logger,
    });

    this.loadPreset();
  }

  loadPreset(idx = 0) {
    this.logger.info("Load preset ", idx, Presets[idx]);

    if (!Presets[idx].totalGenerations) {
      this.logger.warn(
        "Preset %d had no value for totalGenerations: using 1.",
        idx
      );
      Presets[idx].totalGenerations = 1;
    }

    this.settings = {
      ...defaultPresettings,
      ...this.settings,
      ...Presets[idx],
    };

    this.generateAll();
  }

  generateMidi() {
    this.logger.silly("Enter actionCreateMidi");
    this.midi.playFile(
      this.midi.notesContent,
      this.settings.scale,
      this.settings.duration
    );
    this.logger.silly("Leave actionCreateMidi");
  }

  generateAll() {
    this.logger.debug("Enter generateAll");
    this.working = true;
    const canvas = window.document.createElement("canvas");
    this.$refs.canvases.insertBefore(canvas, this.$refs.canvases.firstChild);

    this.lsysRenderer = new LsysRenderer(this.settings, canvas, this.logger);

    canvas.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });

    this.logger.silly("Start Lsys with", this.settings);

    const lsys = new LsysParametric({
      ...this.settings,
      logger: this.logger,
    });

    lsys.generate(this.settings.totalGenerations);

    this.settings.contentDisplay = lsys.content;
    this.lsysRenderer.render(lsys.content, this.midi || undefined);
    this.lsysRenderer.finalise();

    this.generateMidi();
    // this.logger.silly("create midi");
    // this.midi.playFile(
    //   this.midi.notesContent,
    //   this.settings.scale,
    //   this.settings.duration
    // );
    // this.logger.silly("done create midi");

    canvas.addEventListener("click", (e) => {
      e.preventDefault();
      ipcRenderer.send("open-canvas-window", {
        rules: this.settings.rules,
        title: this.settings.title,
        canvasData: canvas.toDataURL(),
        totalGenerations: this.totalGenerations,
      });
    });

    this.working = false;
  }
}
</script>





<style scoped>
section {
  color: white;
  background: black;
  display: block;
  width: 100%;
  overflow: auto;
}
section.working {
  display: none;
  cursor: progress;
}
.column {
  width: 50%;
  float: left;
  overflow: auto;
}
input[type="text"] {
  margin-left: 0.3em;
}
#generateAll {
  float: right;
  border: 0.5rem solid rgb(136, 136, 136);
  padding: 0.3rem;
  margin: 1rem;
}
#player {
  margin: 1rem;
}
#canvases {
  overflow: auto;
  width: 100%;
  margin-top: 1rem;
  padding: 1rem 0;
}
textarea {
  width: 100%;
}
textarea,
input,
select {
  background: silver;
}

label,
label * {
  font-size: 1rem;
  vertical-align: middle;
}
</style>
<style>
canvas {
  width: 20vw;
  height: 20vw;
  margin-top: 1em;
  margin-right: 1em;
}
</style>
