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
			form(action='/search', method='post', id='searchform')
				input#search.form-control(
					type='text',
					name='search',
					autocomplete='off',
					placeholder='search athena',
					value=query
				)

</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'
import VueParticles from 'vue-particles'

Vue.use(VueParticles)

@Component()
class Home extends Vue {
	name = 'Home'
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
