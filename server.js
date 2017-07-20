const express = require('express')
const ipRangeCheck = require('ip-range-check')
const bodyParser = require('body-parser')

const discovery = require('./src/discovery')
const indexer = require('./src/indexer')
const api = require('./src/api')
const helper = require('./src/helper')
const config = require('./config')

/** EXPRESS **/

const app = express()
app.set('view engine', 'ejs');
app.use(express.static('public'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true})) 


app.all('/*', (req, res, next) => {
	if(!ipRangeCheck(req.ip, config.webserver.allowedHosts)) {
		res.status(403).send('You are not allowed to view this page outside the UT');
	} else {
		next()
	}
})

app.get('/', (req, res) => {
	res.render('index')
})

app.post('/search', (req, res) => {
	if(!req.body.search) {
		res.redirect('/')
	} else {
		api.search(req.body.search).then(results => {
			res.render('search', {
				query: req.body.search,
				helper: helper,
				searchresults: results
			})
		}).catch(err => {
			res.status(500).send('Oopsie')
			console.log(err)
		})
	}
})

app.get('/stats', (req, res) => {
	res.render('stats')
})

app.get('/about', (req, res) => {
	res.render('about')
})

app.all('/api*', (req, res) => {
	res.send('API has not been implemented yet!')
})

app.listen(config.webserver.port, () => 
	console.log(`Webserver running on http://${config.webserver.hostname}:${config.webserver.port}`)
);
