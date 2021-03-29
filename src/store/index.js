import { createStore } from 'vuex';

export default createStore({
  state: {
    midiPorts: []
  },
  mutations: {
    setMidiPorts: (state, midiPorts) => state.midiPorts = midiPorts,
  },
  actions: {
  },
  modules: {
  }
})
