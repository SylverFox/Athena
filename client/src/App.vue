<template lang="pug">
  #app
    router-view
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'

@Component()
class App extends Vue {
  name = 'app'
}

export default App
</script>

<style lang="stylus">
@font-face
    font-family Open Sans Light
    font-style normal
    font-weight 300
    src
      url(https://fonts.gstatic.com/s/opensans/v13/DXI1ORHCpsQm3Vp6mXoaTRa1RVmPjeKy21_GQJaLlJI.woff)
      format('woff')

#app
  font-family 'Open Sans Light', sans-serif
</style>
