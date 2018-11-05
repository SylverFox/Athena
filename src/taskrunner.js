const {info, warn, startTimer} = require('winston')
const PQueue = require('p-queue')
const config = require('config')

const discovery = require('./discovery')
const processing = require('./processing')

const queue = new PQueue({concurrency: 1})

/** TASKS **/

/**
 * Discovers new hosts by pinging the entire range, look up their hostnames and listing their shares
 */
function discoverNewHosts() {
	const startTime = Date.now()

	return discovery.build(config.discovery)
		.then(discovery.ping)
		.then(discovery.reverseLookup)
		.then(discovery.listShares)
		.then(processing.appendNewNodes)
		.then(() => processing.insertNewScan('discoverNewHosts', startTime, Date.now() - startTime))
}

/**
 * Pings all known hosts in the database and records their online status
 */
function pingKnownHosts() {
	const startTime = Date.now()

	return processing.getNodeIPList({nodes: null, options: config.discovery})
		.then(discovery.ping)
		.then(processing.updateOnlineStatus)
		.then(processing.insertNewScan('pingKnownHosts', startTime, Date.now() - startTime))
}

/**
 * Indexes all know hosts and records it in the db
 */
function indexKnownHosts() {
	const startTime = Date.now()

	return processing.emptyFilesCache()
		.then(() => processing.getNodeShareList({nodes: null, options: config.discovery}))
		.then(discovery.indexHosts)
		.then(() => processing.insertNewScan('indexKnownHosts', startTime, Date.now() - startTime))
}

/**
 * Does post processing on indexed hosts, such as building keyword indexes
 */
function postProcessing() {
	return processing.buildFileIndex()
		.then(processing.buildDirectoryIndex)
		.then(processing.buildKeywordIndex)
}

// TODO for later releases
function indexStreamableContent() {
	return processing.buildStreamableIndex()
		.then(() => info('done indexing streamable content'))
		.catch(err => warn('building streamable index failed', err))
}

/** OUTSIDE FUNCTIONS **/

/**
 * Adds a job to the queue that pings all known hosts and updates their status in the database
 */
exports.pingHosts = function() {
	info('Running ping known hosts')
	const timer = startTimer()
	queue.add(pingKnownHosts)
		.then(() => timer.done('Pinging known hosts done'))
		.catch(err => warn('Pinging known hosts failed'))
}

/**
 * Runs a full discovery by finding new hosts, scanning who is online, indexing all their shared
 * folders and doing some postprocesing
 */
exports.runFullDiscovery = function() {
	info('Running full discovery')
	const timer = startTimer()
	queue.addAll([
		discoverNewHosts,
		pingKnownHosts,
		indexKnownHosts,
		postProcessing
	]).then(() => timer.done('Full discovery done'))
		.catch(err => warn('Full discovery failed', err.message))
}
