import Vue from 'vue'
// import './plugins/axios'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import VueAxios from 'vue-axios'

Vue.config.productionTip = false

Vue.use(VueAxios, axios)

axios.defaults.baseURL = 'http://' + window.location.hostname + ':8000/'

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
