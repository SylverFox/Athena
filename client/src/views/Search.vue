<template lang="pug">
  section
    div
      form#searchbar(v-on:submit.prevent="search")
        div.input-group
          input#search.form-control(
            type='text',
            v-model.trim='query',
            autocomplete='off',
          )
          span.input-group-btn
            button.btn.btn-primary(type='submit')
              span.glyphicon.glyphicon-search
    div.resultcontainer
      if searchresults && searchresults.length
        ul.searchresults
          each res in searchresults
            res
            li.searchresult
              a.resultname(href='smb:'+(res.paths || [])[0]+'/'+res.filename)= res.filename
              span= ' - '+helper.bytesToSize(res.size)
              br
              span:a.resultpath(href=(res.paths || [])[0])= (res.paths || [])[0]
      else
          | No results :(
    p(v-html="q") q
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'

@Component({
  props: {
    q: {
      type: String,
      default: ''
    }
  }
})
class Search extends Vue {
  name = 'Search'
  query = this.q

  created() {
    this.search()
  }

  search() {
    console.log('searching', this.query)
    Vue.axios.get('search?q=test')
      .then(res => console.log(res.data))
      .catch(console.log)
  }
}

export default Search
</script>

<style lang="stylus" scoped>

</style>
