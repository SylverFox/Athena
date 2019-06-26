<template lang="pug">
	footer.footer.fixed-bottom
		| Version {{process.env.npm_package_version}}
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'

@Component()
class Footer extends Vue {
	name = 'Footer'
}

export default Footer
</script>

<style lang="stylus">
</style>
