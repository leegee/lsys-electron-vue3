<template>
  <main>
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

  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
}
</style>

<script>
import { Vue, Options } from "vue-class-component";

import "./css-vars.css";

@Options({})
export default class App extends Vue {
  async created() {}
}
</script>