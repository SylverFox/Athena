import Vue from 'vue'
// import './plugins/axios'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import VueAxios from 'vue-axios'
import BootstrapVue from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

Vue.config.productionTip = false

axios.defaults.baseURL = 'http://' + window.location.hostname + ':8000/'

Vue.use(VueAxios, axios)
Vue.use(BootstrapVue)

let redirect
axios.get('health')
  .then(res => {
    if(res.status !== 200 || res.data.status !== 'OK') {
      throw Error('Server status not ok')
    }
  })
  .catch(err => {
    if(err.response && err.response.status === 403) {
      redirect = { name: 'forbidden' }
    } else {
      // server down or returns a different error
      redirect = { name: 'serviceUnavailable' }
    }
  })
  .finally(() => {
    new Vue({
      router,
      render: h => h(App)
    }).$mount('#app')

    if(redirect) {
      router.replace(redirect)
    }
  })

