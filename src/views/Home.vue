<template>
  <section v-bind:class="{ working: working === true }">
    <form>
      <div class="column">
        <fieldset>
          <legend>>{{ settings.title || "L-system" }}</legend>
          <p>
            <label
              >Constants
              <small>
                <code>#define name value</code> &mdash; one per line
              </small>
              <textarea id="variables" v-model="settings.variables"></textarea>
            </label>
          </p>

          <p>
            <label
              >Rules
              <small>
                <code>F(x,y): x==1 && y==2 => NewPattern</code>
                &mdash; one rule per line
              </small>
            </label>
            <textarea id="rules" v-model="settings.rules"></textarea>
          </p>

          <p>
            <label
              >Axiom<input type="text" id="start" v-model="settings.start" />
            </label>
          </p>

          <p>
            <label
              >Angle
              <input
                type="range"
                id="angle"
                min="0"
                max="360"
                aria-valuemin="0"
                aria-valuemax="360"
                v-model="settings.angle"
              />
            </label>

            <label
              >Generations
              <input
                type="range"
                min="1"
                max="10"
                aria-valuemin="1"
                aria-valuemax="10"
                id="totalGenerations"
                v-model="settings.totalGenerations"
              />
            </label>
          </p>
        </fieldset>

        <input
          type="button"
          id="actionGenerate"
          value="🖼 Regenerate Image & MIDI"
          @click="actionGenerate"
        />
        <!-- <input type="button" id="actionCreateMidi" value="🎼Regenerate MIDI" /> -->
      </div>

      <div class="column">
        <fieldset>
          <legend>MIDI</legend>
          <p>
            <label
              >Allow notes to be placed back in the past?
              <input
                type="checkbox"
                id="backInTime"
                v-model="settings.backInTime"
              />
            </label>
          </p>

          <p>
            <label
              >Note duration
              <input
                type="range"
                min="1"
                max="250"
                id="duration"
                v-model="settings.duration"
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
                  :value="option"
                  v-bind:key="option"
                >
                  {{ option }}
                </option>
              </select>
            </label>
          </p>

          <p>
            <label
              >Wrap at angle
              <input
                disabled
                type="range"
                id="wrapAngleAt"
                min="0"
                max="360"
                aria-valuemin="0"
                aria-valuemax="360"
                v-model="settings.wrapAngleAt"
              />
            </label>
          </p>
        </fieldset>

        <fieldset>
          <legend>Output</legend>
          <textarea
            id="contentDisplay"
            v-model="settings.contentDisplay"
          ></textarea>
        </fieldset>

        <div id="player"></div>
      </div>
    </form>

    <div ref="canvases" id="canvases"></div>
  </section>
</template>

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

label {
  font-size: 1rem;
}
code {
  font-family: "Lucida Sans", "Lucida Sans Regular", "Lucida Grande",
    "Lucida Sans Unicode", Geneva, Verdana, sans-serif;
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

<script>
import { Vue, Options } from "vue-class-component";
import { ipcRenderer } from "electron";

import Presets, { defaultPresettings } from "@/lib/Presets";
import { scale as tonalScales } from "tonal";
import logger from "@/lib/gui/Logger";
import LsysParametric from "@/lib/LsysParametric";
import LsysRenderer from "@/lib/gui/LsysRenderer";

@Options({
  components: {},
})
export default class Home extends Vue {
  settings = {};
  scales = tonalScales;
  working = false;
  lsys = null;

  mounted() {
    ipcRenderer.on("load-preset", (_event, presetIndex) => {
      this.loadPreset(presetIndex);
    });
    ipcRenderer.on("clear-canvases", () => {
      this.$refs.canvases.innerHTML = "";
    });
    this.loadPreset();
  }

  loadPreset(idx = 0) {
    logger.info("Load preset ", idx, Presets[idx]);

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

    this.actionGenerate();
  }

  actionGenerate() {
    logger.debug("Enter actionGenerate");
    this.working = true;
    const canvas = window.document.createElement("canvas");
    this.$refs.canvases.insertBefore(canvas, this.$refs.canvases.firstChild);

    this.lsysRenderer = new LsysRenderer(this.settings, canvas, logger);

    canvas.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });

    logger.silly("Start Lsys with", this.settings);

    const lsys = new LsysParametric({
      ...this.settings,
      logger: this.logger,
    });

    lsys.generate(this.settings.totalGenerations);

    this.settings.contentDisplay = lsys.content;
    this.lsysRenderer.render(lsys.content, this.midi || undefined);
    this.lsysRenderer.finalise();
    this.working = false;

    canvas.addEventListener("click", (e) => {
      e.preventDefault();
      ipcRenderer.send("open-canvas-window", {
        rules: this.settings.rules,
        title: this.settings.title,
        canvasData: canvas.toDataURL(),
        totalGenerations: this.totalGenerations,
      });
    });
    // this.actionCreateMidi();
  }
}
</script>




