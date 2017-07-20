const express = require('express')
const ipRangeCheck = require('ip-range-check')
const bodyParser = require('body-parser')
const winston = require('winston')

const api = require('./src/api')
const helper = require('./src/helper')
const config = require('./config')
const scheduler = require('./src/scheduler')

winston.level = config.loglevel;
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {colorize: true});
winston.add(winston.transports.File, { filename: 'logs/athena'+Date.now()+'.log'});
scheduler.init(config)

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
			winston.log('warn', 'search page broke', err)
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
	winston.log('info', `Webserver running on http://${config.webserver.hostname}:${config.webserver.port}`)
);
