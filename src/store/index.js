import { createStore } from 'vuex';

export default createStore({
  state: {
    outputDevicesList: {},
    outputDevice: null,
  },
  mutations: {
    setOutputDeviceById: (state, outputDeviceId) => state.outputDevice = state.outputDevicesList[outputDeviceId],
    setOutputDevicesList: (state, outputDevicesList) => state.outputDevicesList = outputDevicesList,
  },
  actions: {
  },
  modules: {
  }
})
