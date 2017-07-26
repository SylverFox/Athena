const {log, startTimer} = require('winston')

const discovery = require('./discovery')
const processing = require('./processing')
const memwatch = require('memwatch-next')
const config = require('../config')

function TaskRunner() {
	this.options = config.discovery
	processing.verifyExistingCollections()
}

TaskRunner.prototype.discoverNewHosts = function() {
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
	.catch(err => log('warn', 'new host discovery failed.', err))
}

TaskRunner.prototype.pingKnownHosts = function() {
	log('info', 'start: ping known hosts.')
	const timer = startTimer()
	const startTime = Date.now()

	processing.getNodeIPList({nodes: null, options: this.options})
	.then(discovery.ping)
	.then(processing.updateOnlineStatus)
	.then(() => {
		timer.done('end: ping known hosts')
		const interval = Date.now() - startTime
		return processing.insertNewScan('pingKnownHosts',startTime,interval)
	})
	.catch(err => log('warn', 'pinging known hosts failed.', err))
}

TaskRunner.prototype.indexKnownHosts = function() {
	log('info', 'start: index known hosts.')
	const hd = new memwatch.HeapDiff()

	const timer = startTimer()
	const startTime = Date.now()

	let updates = []

	processing.emptyFilesCache()
	.then(() => processing.getNodeShareList({nodes: null, options: this.options}))
	.then(res => discovery.indexHosts(res, (data) => {
		updates.push(processing.insertNewFile(data))
	}))
	.then(Promise.all(updates))
	.then(() => {
		timer.done('end: index known hosts.')
		const interval = Date.now() - startTime
		return processing.insertNewScan('indexKnownHosts',startTime,interval)
	})
	.then(processing.buildFileIndex)
	.then(processing.buildDirectoryIndex)
	.then(processing.buildKeywordIndex)
	.then(() => {
		log('info', 'done postprocessing')
		const diff = hd.end()
		console.log(diff)
	})
	.catch(err => log('warn', 'indexing known hosts failed', err))
}

TaskRunner.prototype.postProcessing = function() {
	processing.buildFileIndex()
	.then(processing.buildDirectoryIndex)
	.then(processing.buildKeywordIndex)
	.then(() => {
		log('info', 'done postprocessing')
	})
	.catch(err => log('warn', 'post processing failed', err))
}

module.exports = TaskRunner