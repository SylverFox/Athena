const monk = require('monk')
const responseTime = require('response-time')
const winston = require('winston')
const config = require('./config')
require('console.table')

winston.level = config.loglevel;
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {colorize: true});

/*
const db = monk('localhost/athena')
db.catch(console.log)

const nodesDB = db.get('nodes')
const indexDB = db.get('campusnetindex')
const scansDB = db.get('scans')
const keywdDB = db.get('keywords')
*/
/*
keywdDB.find().each(doc => {
	console.log(doc.filename,doc.value)
}).then(() => {
	console.log('done')
	db.close()
})
*/


const TaskRunner = require('./src/taskrunner')
const taskrunner = new TaskRunner(config.discovery)

//taskrunner.discoverNewHosts()
//taskrunner.pingKnownHosts()
taskrunner.indexKnownHosts()