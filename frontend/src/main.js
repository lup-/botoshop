import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify';
import {router, store} from './router'
import VueTrix from "vue-trix";

Vue.config.productionTip = false

Vue.config.errorHandler = function (err) {
  if (vueInstance) {
    vueInstance.$store.commit('setAppError', err);
  }
  let c = console;
  c.error(err);
};

Vue.use(VueTrix);

let vueInstance = new Vue({
  vuetify,
  store,
  router,
  render: h => h(App)
}).$mount('#app')
