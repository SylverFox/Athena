<template lang="pug">
  section
    div
      form(v-on:submit.prevent="search")
        div.input-group
          input(
            type='text',
            v-model.trim='query',
            autocomplete='off',
          )
          button(type='submit')
    div.resultcontainer
      ul(v-if="searchresults.length")
        li(v-for="res in searchresults" :key="res.id")
          a(:href="res.fullpath") {{ res.filename }}
          span {{ ' - '+bytesToSize(res.size) }}
      p(v-else) No results :(
    p(v-html="q") q
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'
import helpers from '../mixins/helpers'

@Component({
  props: {
    q: {
      type: String,
      default: ''
    }
  },
  mixins: [helpers]
})
class Search extends Vue {
  name = 'Search'
  query = this.q
  searchresults = []

  created() {
    this.search()
  }

  search() {
    if(!this.query) {
      return
    }

    Vue.axios.get('search?q='+this.query)
      .then(res => this.searchresults = res.data)
      .catch(console.log)
  }
}

export default Search
</script>

<style lang="stylus" scoped>

</style>
