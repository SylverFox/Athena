const {log, startTimer} = require('winston')

const discovery = require('./discovery')
const processing = require('./processing')

function IndexingTasks(config) {
	this.options = config;
	this.discoverNewHosts()
}

IndexingTasks.prototype.discoverNewHosts = function() {
	log('info', 'start: new host discovery.')
	const timer = startTimer()
	const startTime = Date.now()

	discovery.build(this.options)
	.then(discovery.ping)
	.then(discovery.reverseLookup)
	.then(discovery.listShares)
	.then(processing.appendNewNodes)
	.then(() => {
		timer.done('end: new host discovery.')
		const interval = Date.now() - startTime
		return processing.insertNewScan('discoverNewHosts',startTime,interval)
	})
	.catch(err => {
		log('warn', 'new host discovery failed.', err)
	})
}

IndexingTasks.prototype.pingKnownHosts = function() {
	log('info', 'start: ping known hosts.')
	const timer = startTimer()

	// TODO

	timer.done('end: ping known hosts.')
}

IndexingTasks.prototype.indexKnownHosts = function() {
	log('info', 'start: index known hosts.')
	const timer = startTimer()

	// TODO

	timer.done('end: index known hosts.')
}

module.exports = IndexingTasks