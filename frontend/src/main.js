import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify';
import store from './store'
import router from './router'

Vue.config.productionTip = false

Vue.config.errorHandler = function (err) {
  if (vueInstance) {
    vueInstance.$store.commit('setAppError', err);
  }
  let c = console;
  c.error(err);
};


let vueInstance = new Vue({
  vuetify,
  store,
  router,
  render: h => h(App)
}).$mount('#app')
