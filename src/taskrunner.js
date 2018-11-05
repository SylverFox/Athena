const {info, warn, startTimer} = require('winston')
const async = require('async')
const config = require('config')

const discovery = require('./discovery')
const processing = require('./processing')

let queue = async.queue(runTask, 1)

function runTask(fn, cb) {
	info('running: '+fn.name)
	const timer = startTimer()
	fn().then(() => {
		timer.done('ended: '+fn.name)
		cb()
	}).catch(err => {
		warn('failed: '+fn.name, err)
		timer.done('ended: '+fn.name)
		cb()
	})
}

/** TASKS **/

function discoverNewHosts() {
	const startTime = Date.now()

	return discovery.build(config.discovery)
		.then(discovery.ping)
		.then(discovery.reverseLookup)
		.then(discovery.listShares)
		.then(processing.appendNewNodes)
		.then(() => processing.insertNewScan('discoverNewHosts', startTime, Date.now() - startTime))
}

function pingKnownHosts() {
	const startTime = Date.now()

	return processing.getNodeIPList({nodes: null, options: config.discovery})
		.then(discovery.ping)
		.then(processing.updateOnlineStatus)
		.then(processing.insertNewScan('pingKnownHosts', startTime, Date.now() - startTime))
}

function indexKnownHosts() {
	const startTime = Date.now()

	return processing.emptyFilesCache()
		.then(() => processing.getNodeShareList({nodes: null, options: config.discovery}))
		.then(discovery.indexHosts)
		.then(() => processing.insertNewScan('indexKnownHosts', startTime, Date.now() - startTime))
}

function postProcessing() {
	return processing.buildFileIndex()
		.then(processing.buildDirectoryIndex)
		.then(processing.buildKeywordIndex)
}

function indexStreamableContent() {
	return processing.buildStreamableIndex()
		.then(() => info('done indexing streamable content'))
		.catch(err => warn('building streamable index failed', err))
}

/** OUTSIDE FUNCTIONS **/

exports.runFullDiscovery = function(defer) {
	defer = defer || 0

	setTimeout(() => {
		queue.push(discoverNewHosts)
		queue.push(pingKnownHosts)
		queue.push(indexKnownHosts)
		queue.push(postProcessing)	
	}, defer)
}

exports.indexHosts = function(defer) {
	defer = defer || 0

	setTimeout(() => {
		queue.push(indexKnownHosts)
	}, defer)
}

exports.pingHosts = function(defer) {
	defer = defer || 0

	setTimeout(() => {
		queue.push(pingKnownHosts)
	}, defer)
}