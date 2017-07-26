const {log, startTimer} = require('winston')

const discovery = require('./discovery')
const processing = require('./processing')
const config = require('../config')

exports.discoverNewHosts = function(callback) {
	log('info', 'start: new host discovery.')
	const timer = startTimer()
	const startTime = Date.now()

	discovery.build(config.discovery)
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

exports.pingKnownHosts = function(callback) {
	log('info', 'start: ping known hosts.')
	const timer = startTimer()
	const startTime = Date.now()

	processing.getNodeIPList({nodes: null, options: config.discovery})
	.then(discovery.ping)
	.then(processing.updateOnlineStatus)
	.then(() => {
		timer.done('end: ping known hosts')
		const interval = Date.now() - startTime
		return processing.insertNewScan('pingKnownHosts',startTime,interval)
	})
	.catch(err => log('warn', 'pinging known hosts failed.', err))
}

exports.indexKnownHosts = function(callback) {
	log('info', 'start: index known hosts.')


	const timer = startTimer()
	const startTime = Date.now()

	processing.emptyFilesCache()
	.then(() => processing.getNodeShareList({nodes: null, options: config.discovery}))
	.then(discovery.indexHosts(res)
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
		if (callback) callback()
	})
	.catch(err => log('warn', 'indexing known hosts failed', err))
}

exports.postProcessing = function(callback) {
	processing.buildFileIndex()
	.then(processing.buildDirectoryIndex)
	.then(processing.buildKeywordIndex)
	.then(() => {
		log('info', 'done postprocessing')
	})
	.catch(err => log('warn', 'post processing failed', err))
}