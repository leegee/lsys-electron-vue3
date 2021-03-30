import { createStore } from 'vuex';

export default createStore({
  state: {
    outputDevicesList: {},
    outputDevice: null,
  },
  mutations: {
    setOutputDeviceById: (state, outputDeviceId) => {
      // https://webaudio.github.io/web-midi-api/#sending-midi-messages-to-an-output-device
      if (state.outputDevice) {
        state.outputDevice.close();
      }
      state.outputDevice = state.outputDevicesList[outputDeviceId];
      state.outputDevice.open();
    },

    setOutputDevicesList: (state, outputDevicesList) => state.outputDevicesList = outputDevicesList,
  },
  actions: {
  },
  modules: {
  }
})
