<template>
  <main>
    <CustomMenuBar />
    <!-- <div id="nav">
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </div> -->
    <router-view />
  </main>
</template>

<style>
html,
body,
main {
  padding: 0;
  margin: 0;
  background-color: var(--app-bg);
  color: var(--app-fg);
}
</style>

<script>
import { Vue, Options } from "vue-class-component";
import CustomMenuBar from "@/components/CustomMenuBar";

import "./css-vars.css";

@Options({
  components: { CustomMenuBar },
})
export default class App extends Vue {
  async created() {}
}
</script>