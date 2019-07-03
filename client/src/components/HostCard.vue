<template lang="pug">
b-card(no-body)
  b-tabs(card, align="center")
    b-tab(title="Amount of files", active)
      line-chart(:data="data.files", :messages="{empty: 'No data'}")
    b-tab(title="Total size")
      line-chart(:data="data.size", :messages="{empty: 'No data'}", :ytitle="'(GB)'")
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'

@Component({
  props: {
    id: { type: Number }
  }
})
class HostCard extends Vue {
  name = 'HostCard'
  loading = true
  data = {}

  created() {
    Vue.axios.get(`stats/host/${this.id}`)
      .then(res => this.data = this.parseData(res.data.HostHistories))
      .finally(() => this.loading = false)
  }

  parseData(data) {
    let parsed = {files: {}, size: {}}
    for (let item of data) {
      parsed.files[item.date] = item.files
      parsed.size[item.date] = item.size / (1024 ** 3)
    }
    return parsed
  }
}

export default HostCard
</script>

<style lang="stylus" scoped>

</style>
