<template lang="pug">
  b-container
    h2.mt-5 What is Athena?
    p Athena is a community-driven project that enables indexing and searching of media content on
      |  campusnet. This started as a hobby project when
      |  #[a(href="http://search.student.utwente.nl/") CampusSearch] started having trouble.
    p The main focus of this search engine is to be lightweight (it runs on a raspberry PI 3) and
      |  open source.
    h2 Contribute
    p There are several ways to contribute to the project.
    h3 Bugs, issues and feature requests
    p If you encounter any problems while using Athena or if you have any feature requests, please
      |  open an issue on #[a(href="https://github.com/SylverFox/Athena/issues") Github].
    h3 Clone, fork and PR
    p If you're a programmer, you can clone or fork the
      |  #[a(href="https://github.com/SylverFox/Athena") Athena project]. Then you can either run it
      |  yourself or create a pull request for the main project.
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
