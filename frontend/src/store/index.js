import Vue from 'vue';
import Vuex from 'vuex';

import cv from "./modules/cv";

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        appError: false
    },
    mutations: {
        setAppError(state, error) {
            state.appError = error;
        },
    },
    actions: {},
    modules: {
      cv
    }
})
