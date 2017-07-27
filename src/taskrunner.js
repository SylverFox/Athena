const {info, warn, startTimer} = require('winston')

const discovery = require('./discovery')
const processing = require('./processing')
const config = require('../config')

exports.discoverNewHosts = function(callback) {
	info('start: new host discovery.')
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
	.catch(err => warn('new host discovery failed.', err))
}

exports.pingKnownHosts = function(callback) {
	info('start: ping known hosts.')
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
	.catch(err => warn('pinging known hosts failed.', err))
}

exports.indexKnownHosts = function(callback) {
	info('start: index known hosts.')


	const timer = startTimer()
	const startTime = Date.now()

	processing.emptyFilesCache()
	.then(() => processing.getNodeShareList({nodes: null, options: config.discovery}))
	.then(discovery.indexHosts)
	.then(() => {
		timer.done('end: index known hosts.')
		const interval = Date.now() - startTime
		return processing.insertNewScan('indexKnownHosts',startTime,interval)
	})
	.then(processing.buildFileIndex)
	.then(processing.buildDirectoryIndex)
	.then(processing.buildKeywordIndex)
	.then(() => {
		info('done postprocessing')
		if (callback) callback()
	})
	.catch(err => warn('indexing known hosts failed', err))
}

exports.postProcessing = function(callback) {
	processing.buildFileIndex()
	.then(processing.buildDirectoryIndex)
	.then(processing.buildKeywordIndex)
	.then(() => {
		info('done postprocessing')
	})
	.catch(err => warn('post processing failed', err))
}

exports.indexStreamableContent = function(callback) {
	processing.buildStreamableIndex()
	.then(() => info('done indexing streamable content'))
	.catch(err => warn('building streamable index failed', err))
}