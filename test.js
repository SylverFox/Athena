'use strict'

const winston = require('winston')
const config = require('./config')

winston.level = 'debug'
winston.remove(winston.transports.Console)
winston.add(winston.transports.Console, {colorize: true, timestamp: true})
winston.add(winston.transports.File, {filename: config.loglocation+'/athena.log', timestamp: true})


const taskrunner = require('./src/taskrunner')

//taskrunner.pingHosts()
//taskrunner.runFullDiscovery()
//taskrunner.indexHosts()

const smb = require('smb2c')
const s = new smb({
	share: '\\\\XIS\\games',
	domain: 'microsoftaccount',
	username: 'guest',
	password: ''
})

s.readdir('', (err, files) => {
	console.log(err)
	console.log(files)
})