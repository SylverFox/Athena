'use strict'

const monk = require('monk')
const responseTime = require('response-time')
const winston = require('winston')
const config = require('./config')
require('console.table')

winston.level = 'debug'
winston.remove(winston.transports.Console)
winston.add(winston.transports.Console, {colorize: true, timestamp: true})
winston.add(winston.transports.File, {filename: config.loglocation+'/athena.log'})


const taskrunner = require('./src/taskrunner')

taskrunner.pingHosts()
taskrunner.runFullDiscovery()