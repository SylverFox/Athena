<template lang="pug">
b-container(fluid, :style="{ 'background-image': 'url('+pattern+')' }")
  b-row.mb-5
  b-row.justify-content-center.mb-5
    h1 Athena
  b-row.justify-content-center
    b-col
      b-form(@submit.prevent="search")
        b-form-input(
          v-model='query',
          trim, 
          autofocus, 
          autocomplete="off", 
          placeholder="Search Athena"
        )
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'
import Trianglify from 'trianglify'

@Component()
class Home extends Vue {
  name = 'Home'
  query = ''
  pattern = '../assets/img/bg.png'

  created() {
    // @see https://github.com/qrohlf/trianglify
    const pattern = Trianglify({
      width: screen.width,
      height: screen.height
    })
    this.pattern = pattern.png()
  }

  search() {
    this.$router.push({ name: 'search', params: { q: this.query } })
  }
}

export default Home
</script>

<style lang="stylus" scoped>
.container-fluid
  height 100vh
  background-position center
  background-repeat no-repeat
  background-size cover

input
  max-width 500px
  margin 0 auto 0
</style>
