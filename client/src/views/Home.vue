<template lang="pug">
	section
		vue-particles(
			color='#fff',
			:particleOpacity=0.5,
			:particlesNumber='100',
			:particleSize=3,
			linesColor='#fff',
			:moveSpeed=2,
			:hoverEffect="false",
			:clickEffect="false"
		)
		.title-bar
			h1 Athena
			form#searchform(v-on:submit.prevent="search")
				input#search.form-control(
					type='text',
					v-model.trim='query'
					autocomplete='off',
					placeholder='search athena'
				)
		p= helpers

</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'
import VueParticles from 'vue-particles'
import helpers from '@/mixins/helpers'

Vue.use(VueParticles)

@Component({
	mixins: [helpers]
})
class Home extends Vue {
	name = 'Home'
	query = ''

	search() {
		this.$router.push({ name: 'search', params: { q: this.query } })
	}
}

export default Home
</script>

<style lang="stylus" scoped>
#particles-js
	position fixed
	left 0
	top 0
	height 100%
	width 100%
	z-index -1
</style>
