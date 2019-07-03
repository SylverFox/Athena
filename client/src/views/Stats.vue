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
        :items="hostsProvider",
        :fields="hostsFields",
        :busy.sync="hostsLoading",
        @row-clicked="rowClicked"
      )
        template(slot-scope="data", slot="status")
          b-badge(:variant="data.value ? 'success' : 'danger'")
            | {{ data.value ? 'online' : 'offline'}}
        template(slot-scope="data", slot="total_size") {{ bytesToSize(data.value) }}
        template(slot-scope="data", slot="last_seen") {{ timestampToLastseen(data.value) }}
        template(slot-scope="row", slot="row-details")
          HostCard(:id="row.item.id")
        .text-center.my-2(slot="table-busy")
          b-spinner(variant="info")
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'
import helpers from '../mixins/helpers'
import HostCard from '../components/HostCard'

@Component({
  mixins: [helpers],
  components: {
    HostCard
  }
})
class Stats extends Vue {
  name = 'Stats'
  loadingServer = true
  serverstats = {}

  hostsLoading = false
  hostsFields = [
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
  }

  hostsProvider() {
    this.hostsLoading = true
    return Vue.axios.get('stats/hosts')
      .then(res => this.parseHosts(res.data))
      .catch(err =>
        this.toast('Error while fetching hosts stats', err.message, 'danger')
      ).finally(() => this.hostsLoading = false)
  }

  parseHosts(hostsdata) {
    return hostsdata.map(host => ({
      id: host.id,
      status: new Date(host.lastseen) > Date.now() - (5 * 60 * 1000),
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
