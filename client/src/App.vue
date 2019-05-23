<template lang="pug">
	#app
		Header
		main
			router-view
		Footer
</template>

<script>
import Vue from 'vue'
import { Component } from 'vue-property-decorator'

import Header from '@/components/Header'
import Footer from '@/components/Footer'

@Component({
	components: {
		Header,
		Footer
	}
})
class App extends Vue {
	name = 'app'
}

export default App
</script>

<style lang="stylus">
@font-face
		font-family Open Sans Light
		font-style normal
		font-weight 300
		src url(https://fonts.gstatic.com/s/opensans/v13/DXI1ORHCpsQm3Vp6mXoaTRa1RVmPjeKy21_GQJaLlJI.woff) format('woff')

body
	width 100%
	height 100%
	margin 0
	padding 0
	font-family 'Open Sans Light', sans-serif
	display flex
	align-items center
	min-height 100vh
	flex-direction column
	background-color GAINSBORO

#app
	width 100%
	height 100%
	margin 0
	padding 0
	font-family 'Open Sans Light', sans-serif
	display flex
	align-items center
	min-height 100vh
	flex-direction column
	background-color GAINSBORO

a, a:hover, a:active, a:visited
    color black

h1
	font-weight 200
	font-size 200%

h2 a:hover
	border-bottom 1px solid black
	text-decoration none

hr
	margin 0
	border-color black

main
	width 90%
	margin-bottom 2em


</style>
