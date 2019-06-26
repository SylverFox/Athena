<template lang="pug">
  b-container.flex-column.justify-content-center
    b-container.searchcontainer.my-3
      b-form(@submit.prevent="search")
        b-form-row
          b-col(cols="auto", md="5")
            b-form-input(v-model='query', trim, autofocus, autocomplete="off")
          b-col(cols="auto")
            b-button(type="submit") Search

    b-container.resultcontainer.my-3
      .text-center.mt-5
        b-spinner(v-show="searching", variant="info")
      p.text-right.small(v-if="searchstats")
        | Found {{ searchstats.count }} results in {{ intervalToTime(searchstats.time) }}
      b-list-group
        b-list-group-item(v-for="res in searchresults", :key="res.id")
          b-link(:href="res.fullpath", @click.prevent="copyToClipboard(res.fullpath)")
            | {{ res.filename }}
          small.text-muted - {{ bytesToSize(res.size) }}
          br
          b-link.text-muted.small(
            :href="res.location", @click.prevent="copyToClipboard(res.location)"
          ) {{ res.location }}
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
  searching = false
  searchstats = null

  mounted() {
    this.search()
  }

  search() {
    if(!this.query || !this.query.length) {
      return
    }

    const starttime = Date.now()

    this.searchresults = []
    this.searchstats = null
    this.searching = true

    Vue.axios.get('search?q='+this.query)
      .then(res => {
        this.searchresults = res.data
        this.searchstats = {
          count: res.data.length,
          time: Date.now() - starttime
        }
      })
      .catch(err => {
        this.toast('Error while searching', err.message, 'error')
      })
      .finally(() => {
        this.searching = false
      })
  }

  copyToClipboard(content) {
    navigator.permissions.query({name: 'clipboard-write'}).then(result => {
      if(result.state === 'granted' || result.state === 'prompt') {
        navigator.clipboard.writeText(content)
          .then(() => this.toast(
            'URL copied to clipboard',
            'Paste in Explorer/Finder to open location',
            'success'
          ))
          .catch(() => this.toast(
            'Unable to copy URL to clipboard',
            'No permission given to copy to clipboard',
            'error'
          ))
      }
    })
  }

  toast(title, msg, variant) {
    this.$bvToast.toast(msg, {
      toaster: 'b-toaster-bottom-right',
      title,
      variant
    })
  }
}

export default Search
</script>

<style lang="stylus" scoped>

</style>
