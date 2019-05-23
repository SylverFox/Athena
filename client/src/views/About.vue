<template lang="pug">
  p About page
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'

@Component()
class About extends Vue {
  name = 'About'
}

export default About
</script>

<style lang="stylus" scoped>

</style>
