<template lang="pug">
  p 404
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'

@Component()
class PageNotFound extends Vue {
  name = 'PageNotFound'
}

export default PageNotFound
</script>

<style lang="stylus" scoped>

</style>
