'use strict'

require('console.table')
const fs = require('fs')
const ini = require('ini')
const winston = require('winston')

const express = require('express')
const ipRangeCheck = require('ip-range-check')
const bodyParser = require('body-parser')
const responseTime = require('response-time')
const schedule = require('node-schedule')

//const api = require('./src/api')
//const helper = require('./src/helper')
//const taskrunner = require('./src/taskrunner')
const Processing = require('./src/processing')
//const stream = require('./src/stream')

/* INIT CONFIG */
let config
try {
	config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'))
} catch (err) {
	console.error('no config file found!')
	process.exit()
}

/* INIT WINSTON */
if(!fs.existsSync(config.logging.location))
	fs.mkdirSync(config.logging.location)
winston.level = config.logging.level
winston.remove(winston.transports.Console)
winston.add(winston.transports.Console, {colorize: true, timestamp: true})
winston.add(winston.transports.File, {filename: config.logging.location+'/athena.log', timestamp: true})

/** INIT NeDB **/
const processor = new Processing(config)
/*
processing.integrityCheck()
processing.getNodeCount().then((count) => {
	if(!count) {
		// No nodes in database, so this is probably the first run. schedule a full discovery in 5 minutes
		taskrunner.runFullDiscovery()
	}
})
*/

/** INIT SCHEDULER **/

schedule.scheduleJob(config.scheduling.pingTime, taskrunner.pingHosts)
schedule.scheduleJob(config.scheduling.discoverTime, taskrunner.runFullDiscovery)

/** INIT EXPRESS **/

const app = express()
app.set('view engine', 'pug')
if(app.get('env') !== 'production') {
	app.set('view options', { pretty: true })
	app.locals.pretty = true
}
app.use(express.static('public'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true})) 
app.use(responseTime())


app.all('/*', (req, res, next) => {
	if(!ipRangeCheck(req.ip, config.webserver.allowedHosts)) {
		res.status(403).send('You are not allowed to view this page outside the UT')
	} else {
		next()
	}
})

app.get('/', (req, res) => res.render('index'))

app.post('/search', (req, res) => {
	if(!req.body.search) {
		res.redirect('/')
	} else {
		api.search(req.body.search).then(results => {
			res.render('search', {
				query: req.body.search,
				helper: helper,
				searchresults: JSON.parse(results)
			})
		}).catch(err => {
			res.sendStatus(500)
			winston.error('search page broke', err)
		})
	}
})

app.get('/stats', (req, res) => {
	api.getStatistics().then(stats => {
		res.render('stats', {
			stats: JSON.parse(stats),
			helper: helper
		})
	})
	
})

app.get('/about', (req, res) => res.render('about'))
app.get('/watch', (req, res) => res.render('watch'))
app.get('/stream', stream)

app.all('/api*', (req, res) => {
	res.send('API has not been implemented yet!')
})

app.listen(config.webserver.port, () =>
	winston.info(`Webserver running on http://${config.webserver.hostname}:${config.webserver.port}`)
)
