<template lang="pug">
	header
		h2
			a(href='/') Athena
		hr
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'

@Component()
class Header extends Vue {
	name = 'Header'
}

export default Header
</script>

<style lang="stylus" scoped>
header
	width 90%
	margin-bottom 2em
</style>
