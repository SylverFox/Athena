<template lang="pug">
  main
    Header
    router-view
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'
import Header from '../components/Header'

@Component({
  components: {
    Header
  }
})
class Main extends Vue {
  name = 'Main'
}

export default Main
</script>

<style lang="stylus">
</style>
