<template lang="pug">
	footer
		hr
		.footer-content
			.footer-links
				router-link(:to={ name: 'about'}) About
				router-link(:to={ name: 'stats'}) Stats
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

<style lang="stylus" scoped>
footer
	width 90%
	margin-top
	&.content
		distplay flex
		justify-content flex-end
</style>
