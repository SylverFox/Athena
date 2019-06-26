<template lang="pug">
  #app
    Header
    router-view
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'
import Header from './components/Header'
import Footer from './components/Footer'

@Component({
  components: {
    Header,
    Footer
  }
})
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
