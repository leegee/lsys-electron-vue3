<template>
  <section>
    <nav id="menu-bar">
      <header class="left" role="menu">
        <button id="burger" @click="openMenu($event.x, $event.y)">
          <i class="fas fa-bars"></i>
        </button>

        <MidiController />

        <button id="actionGenerate" @click="actionGenerate">
          Regenerate Image &amp; MIDI
        </button>
      </header>

      <aside class="right">
        <button class="winCtrl" @click="minimizeWindow">
          <i class="fas fa-window-minimize"></i>
        </button>
        <button id="close-btn" class="winCtrl" @click="closeWindow">
          <i class="fas fa-times"></i>
        </button>
      </aside>
    </nav>
  </section>
</template>

<style>
@import "../assets/fa/fa.css";

#menu-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 30px;
  background-color: var(--app-bg);
  color: var(--app-fg);
  -webkit-app-region: drag;
  position: relative;
}

#menu-bar > div {
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

#burger,
.winCtrl {
  -webkit-app-region: no-drag;
  height: 100%;
  padding-left: 1rem;
  border: none;
  background: transparent;
  outline: none;
}

#menu-bar button:hover {
  background: rgba(221, 221, 221, 0.2);
}

#close-btn:hover {
  background: red;
}

#menu-bar button i {
  color: var(--app-fg);
}

#midi-out {
  width: 10em;
  background-color: var(--app-fg-dim);
  color: var(--app-bg);
}

#actionGenerate {
  display: inline-block;
  background-color: var(--app-fg-dim);
  margin: 0 1rem;
}
</style>

<script>
import { Vue, Options } from "vue-class-component";
import { ipcRenderer } from "electron";
import MidiController from "@/components/MidiController";

@Options({
  components: {
    MidiController,
  },
})
export default class CustomMenuBar extends Vue {
  outputDevice = null;

  openMenu(x, y) {
    ipcRenderer.send(`display-app-menu`, { x, y });
  }

  minimizeWindow() {
    ipcRenderer.send("minimize");
  }

  closeWindow() {
    ipcRenderer.send("close");
  }

  actionGenerate() {
    console.log("** action generate");
    // import { BrowserWindow, Menu } from 'electron';
    // BrowserWindow.getFocusedWindow().webContents.send('action-generate', index);
    ipcRenderer.send("action-generate");
  }
}
</script>