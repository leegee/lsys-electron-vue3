<template>
  <section>
    <nav id="menu-bar">
      <header class="left" role="menu">
        <button @click="openMenu($event.x, $event.y)">
          <i class="fas fa-bars"></i>
        </button>

        <MidiController />
      </header>

      <aside class="right">
        <button @click="minimizeWindow">
          <i class="fas fa-window-minimize"></i>
        </button>
        <button @click="maxUnmax" ref="maxUnmaxButton">
          <i class="far fa-square"></i>
        </button>
        <button id="close-btn" @click="closeWindow">
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

#menu-bar button {
  -webkit-app-region: no-drag;
  height: 100%;
  padding: 0 15px;
  border: none;
  background: transparent;
  outline: none;
}

#menu-bar button:hover {
  background: rgba(221, 221, 221, 0.2);
}

#close-btn:hover {
  background: rgb(255, 0, 0);
}

#menu-bar button i {
  color: var(--app-fg);
}

#midi-out {
  width: 10em;
  background-color: var(--app-fg-dim);
  color: var(--app-bg);
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

  async maxUnmax() {
    const isMaximized = await ipcRenderer.invoke("max-unmax-window");
    const icon = this.$refs.maxUnmaxButton.querySelector("i.far");

    if (isMaximized) {
      icon.classList.add("fa-square");
      icon.classList.remove("fa-clone");
    } else {
      icon.classList.remove("fa-square");
      icon.classList.add("fa-clone");
    }
  }

  openMenu(x, y) {
    ipcRenderer.send(`display-app-menu`, { x, y });
  }

  minimizeWindow() {
    ipcRenderer.send("minimize");
  }

  maximizeWindow() {
    ipcRenderer.send("maximize");
  }

  unmaximizeWindow() {
    ipcRenderer.send("unmaximize");
  }

  closeWindow() {
    ipcRenderer.send("close");
  }
}
</script>