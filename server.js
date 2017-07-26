'use strict'

const express = require('express')
const ipRangeCheck = require('ip-range-check')
const bodyParser = require('body-parser')
const winston = require('winston')
const {MongoClient} = require('mongodb')
const monk = require('monk')
const responseTime = require('response-time')
const schedule = require('node-schedule')
const fs = require('fs')
require('console.table')

const config = require('./config')
const api = require('./src/api')
const helper = require('./src/helper')
const TaskRunner = require('./src/taskrunner')


/** INIT WINSTON **/

if(!fs.existsSync(config.loglocation)) fs.mkdirSync(config.loglocation)
winston.level = config.loglevel
winston.remove(winston.transports.Console)
winston.add(winston.transports.Console, {colorize: true})
winston.add(winston.transports.File, {filename: config.loglocation+'/athena.log'})

/** INIT MONGODB **/

const {username,password,host,port,name} = config.database
const creds = username && password ? `${username}:${password}@` : ''
const db = monk(`mongodb://${creds}${host}:${port}/${name}`, {})
db.then(() => winston.info('connected to MongoDB'))
db.catch(err => winston.error('error', 'failed to connect to mongodb', err))
db.close()

/** INIT SCHEDULER **/

const taskrunner = new TaskRunner(config.discovery)
schedule.scheduleJob(config.scheduling.discoverTime, () => taskrunner.discoverNewHosts())
schedule.scheduleJob(config.scheduling.pingTime, () => taskrunner.pingKnownHosts())
schedule.scheduleJob(config.scheduling.indexTime, () => taskrunner.indexKnownHosts())

/** INIT EXPRESS **/

const app = express()
app.set('view engine', 'pug')
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
				searchresults: results
			})
		}).catch(err => {
			res.status(500).send('Oopsie')
			winston.error('search page broke', err)
		})
	}
})

app.get('/stats', (req, res) => res.render('stats'))
app.get('/about', (req, res) => res.render('about'))

app.all('/api*', (req, res) => {
	res.send('API has not been implemented yet!')
})

app.listen(config.webserver.port, () =>
	winston.info(`Webserver running on http://${config.webserver.hostname}:${config.webserver.port}`)
)
