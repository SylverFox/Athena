<template lang="pug">
  b-container
    b-container
      h2 Athena Statistics
      .text-center.mt-5(v-show="loadingServer")
        b-spinner(variant="info")

    b-container
      h2 Servers
      b-table(
        striped,
        hover,
        per-page="25",
        :items="hostitems",
        :fields="hostfields",
        :busy="loadingHosts",
        @row-clicked="rowClicked"
      )
        template(slot-scope="data", slot="status")
          b-badge(:variant="data.value ? 'success' : 'danger'")
            | {{ data.value ? 'online' : 'offline'}}
        template(slot-scope="data", slot="total_size") {{ bytesToSize(data.value) }}
        template(slot-scope="data", slot="last_seen") {{ timestampToLastseen(data.value) }}
        template(slot-scope="row", slot="row-details")
          b-card(no-body)
            b-tabs(card, align="center")
              b-tab(title="Amount of files", active)
                b-card-text Files graph over time
                line-chart(:data="{'2017-05-13': 2, '2017-05-14': 5}")
              b-tab(title="Total size")
                b-card-text Total size over time
        .text-center.my-2(slot="table-busy")
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
    { key: 'status' },
    { key: 'hostname', sortable: true },
    { key: 'files', sortable: true },
    { key: 'total_size', sortable: true },
    { key: 'last_seen', sortable: true }
  ]

  created() {
    Vue.axios
      .get('stats')
      .then(res => (this.server = res.data))
      .catch(err =>
        this.toast('Error while fetching server stats', err.message, 'danger')
      )
      .finally(() => (this.loadingServer = false))
    Vue.axios
      .get('stats/hosts')
      .then(res => this.parseHosts(res.data))
      .catch(err =>
        this.toast('Error while fetching hosts stats', err.message, 'danger')
      )
      .finally(() => (this.loadingHosts = false))
  }

  parseHosts(hostsdata) {
    this.hostitems = hostsdata.map(host => ({
      status: new Date() - new Date(host.lastseen) < 5 * 60 * 1000,
      hostname: host.hostname.split('.student.utwente.nl')[0],
      files: host.Shares.reduce((a, b) => a + b.filecount, 0),
      total_size: host.Shares.reduce((a, b) => a + b.size, 0),
      last_seen: host.lastseen,
      _showDetails: false
    }))
  }

  rowClicked(record) {
    record._showDetails = !record._showDetails
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

<style lang="stylus" scoped></style>
