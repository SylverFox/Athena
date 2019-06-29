'use strict'

const fs = require('fs')
const winston = require('winston')
const config = require('config')
const express = require('express')
const cors = require('cors')
const responseTime = require('response-time')
const Scheduler = require('simple-task-scheduler')
const {IpFilter, IpDeniedError} = require('express-ipfilter')

const taskrunner = require('./src/taskrunner')
const api = require('./src/api')

/* INIT WINSTON */

if(!fs.existsSync(config.logging.location))
  fs.mkdirSync(config.logging.location)

winston.level = config.logging.level
winston.add(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
    winston.format.padLevels(),
    winston.format.errors({ stack: true }),
    winston.format.printf(log =>
      `${log.timestamp} ${log.level}: ${log.message}${log.stack ? '\n'+log.stack : ''}`
    )
  )
}))
winston.add(new winston.transports.File({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  filename: config.logging.location+'/athena.log',
}))

/** INIT JOB SCHEDULER **/

// Run full discovery 1 minute after startup
Scheduler.doAfter(taskrunner.runFullDiscovery, { minutes: 1})
// Then run every day at midnight
Scheduler.doRecurrentCron(taskrunner.runFullDiscovery, '0 0 * * *')
// Ping all hosts every 5 minutes
Scheduler.doRecurrent(taskrunner.pingHosts, { minutes: 5 })

/** INIT EXPRESS **/

const app = express()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true })) 
app.use(responseTime())
app.use(cors())
app.use(IpFilter(config.webserver.allowedHosts, { mode: 'allow', logLevel: 'deny' }))

// API routes
app.use('/search', api.search)
app.use('/stats', api.stats)
app.use('/health', api.health)

// Error handlers
// Todo: define better error handlers
app.use((err, req, res, next) => {
  if (err instanceof IpDeniedError) {
    res.status(403).send({error: 'Not allowed. Request IP not from campusnet' })
  } else {
    winston.error(err.message, { stack: err.stack })
    res.status(500).send({error: err.message})
  }

  next()
})


const port = config.webserver.port
app.listen(port, () => winston.info(`Webserver running on http://localhost:${port}`))
  .on('error', err => winston.error('Unable to start webserver', { stack: err.stack }))
