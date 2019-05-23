import Vue from 'vue'
import Router from 'vue-router'

import Home from '@/views/Home.vue'
import About from '@/views/About.vue'
import Search from '@/views/Search.vue'
import Stats from '@/views/Stats.vue'
import Watch from '@/views/Watch.vue'

Vue.use(Router)

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/about',
      name: 'about',
      component: About
    },
    {
      path: '/search',
      name: 'search',
      component: Search
    },
    {
      path: '/stats',
      name: 'stats',
      component: Stats
    },
    {
      path: '/watch',
      name: 'watch',
      component: Watch
    }
  ]
})
