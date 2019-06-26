<template lang="pug">
  b-navbar(toggleable="md", type="dark", variant="info")
    b-navbar-brand Athena
    b-navbar-toggle(target="navbarContent")
    b-collapse#navbarContent(is-nav)
      b-navbar-nav
        b-nav-item(:active="$route.name === 'search'" :to="{ name: 'search' }") Search
        b-nav-item(:active="$route.name === 'stats'"  :to="{ name: 'stats' }") Stats
        b-nav-item(:active="$route.name === 'api'"    :to="{ name: 'api' }", disabled) Api
        b-nav-item(:active="$route.name === 'about'"  :to="{ name: 'about' }") About
      b-navbar-nav.ml-auto
        b-nav-text V #{process.env.npm_package_version}
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'

@Component()
class Header extends Vue {
  name = 'Header'
}

export default Header
</script>

<style lang="stylus">
</style>
