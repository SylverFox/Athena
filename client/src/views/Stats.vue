<template lang="pug">
  b-container
    b-container
      h2 Athena Statistics
      .text-center.mt-5(v-show="loadingServer")
        b-spinner(variant="info")

    b-container
      h2 Servers
      b-table(striped :items="hostitems" :fields="hostfields")
      .text-center.mt-5(v-show="loadingHosts")
        b-spinner(variant="info")
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'
import helpers from '../mixins/helpers'

@Component({
  mixins: [helpers]
})
class Stats extends Vue {
  name = 'Stats'
  loadingServer = true
  loadingHosts = true
  serverstats = {}
  hostitems = []
  hostfields = [
    { key: 'online' },
    { key: 'hostname', sortable: true },
    { key: 'total_size', sortable: true },
    { key: 'last_seen', sortable: true }
  ]

  created() {
    Vue.axios.get('stats')
      .then(res => this.server = res.data)
      .catch(err => this.toast('Error while fetching server stats', err.message, 'danger'))
      .finally(() => this.loadingServer = false)
    Vue.axios.get('stats/hosts')
      .then(res => this.parseHosts(res.data))
      .catch(err => this.toast('Error while fetching hosts stats', err.message, 'danger'))
      .finally(() => this.loadingHosts = false)
  }

  parseHosts(hostsdata) {
    this.hostitems = hostsdata.map(host => ({
      online: new Date() - new Date(host.lastseen) < 5 * 60 * 1000,
      hostname: host.hostname.split('.student.utwente.nl')[0],
      total_size: this.bytesToSize(host.Shares.reduce((a,b) => a + b.size, 0)),
      last_seen: this.timestampToLastseen(host.lastseen)
    }))
  }

  // todo move to mixin
  toast(title, msg, variant) {
    this.$bvToast.toast(msg, {
      toaster: 'b-toaster-bottom-right',
      title,
      variant
    })
  }
}

export default Stats
</script>

<style lang="stylus" scoped>

</style>
