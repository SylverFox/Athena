import Vue from 'vue'
import Router from 'vue-router'

import Main from './views/Main'
import Home from './views/Home'
import About from './views/About'
import Search from './views/Search'
import Stats from './views/Stats'
import Watch from './views/Watch'
import PageNotFound from './views/errors/PageNotFound'
import Forbidden from './views/errors/Forbidden'
import ServiceUnavailable from './views/errors/ServiceUnavailable'

Vue.use(Router)

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/',
      component: Main,
      children: [
        {
          path: 'about',
          name: 'about',
          component: About
        },
        {
          path: 'search',
          name: 'search',
          component: Search,
          props: true
        },
        {
          path: 'stats',
          name: 'stats',
          component: Stats
        },
        {
          path: 'watch',
          name: 'watch',
          component: Watch,
          props: true
        }
      ]
    },
    {
      path: '503',
      name: 'serviceUnavailable',
      component: ServiceUnavailable
    },
    {
      path: '403',
      name: 'forbidden',
      component: Forbidden
    },
    {
      path: '*',
      name: '404',
      component: PageNotFound
    }
  ]
})

export default router