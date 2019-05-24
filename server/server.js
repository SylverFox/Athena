'use strict'

const fs = require('fs')
const winston = require('winston')
const config = require('config')
const express = require('express')
const responseTime = require('response-time')
const schedule = require('node-schedule')
const ipfilter = require('express-ipfilter').IpFilter

// const taskrunner = require('./src/taskrunner')
// const api = require('./src/api')
// const stream = require('./src/stream')
// const processing = require('./src/processing')

/* INIT WINSTON */

if(!fs.existsSync(config.logging.location))
	fs.mkdirSync(config.logging.location)

winston.level = config.logging.level
winston.remove(winston.transports.Console)
winston.add(winston.transports.Console, {colorize: true, timestamp: true})
winston.add(winston.transports.File, {
	filename: config.logging.location+'/athena.log',
	timestamp: true
})


/** INIT JOB SCHEDULER **/

// schedule.scheduleJob(config.scheduling.pingTime, taskrunner.pingHosts)
// schedule.scheduleJob(config.scheduling.discoverTime, taskrunner.runFullDiscovery)

/** INIT EXPRESS **/

const app = express()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true })) 
app.use(responseTime())
app.use(ipfilter(config.webserver.allowedHosts))
// Todo better package than ipfilter
app.set('port', )

app.get('*', (req, res) => res.send({
	message: 'Welcome to the beginning of nothingness.',
}))

const port = config.webserver.port
app.listen(port, () => winston.info(`Webserver running on http://localhost:${port}`))
