const events = require('events')
const {info, warn, debug, startTimer} = require('winston')
const PQueue = require('p-queue')

const discovery = require('./discovery')
const processing = require('./processing')

const queue = new PQueue({concurrency: 1})

/** TASKS **/

/**
 * Discovers new hosts by pinging the entire range, look up their hostnames and listing their shares
 */
async function discoverNewHosts() {
	// debug('starting discovernewhosts')
	const startTime = new Date()

	const hosts = await discovery.build()
	const task = async host => {
		await discovery.ping(host)
		if(!host.online) return
		await discovery.reverseLookup(host)
		if(!host.hostname) return
		await discovery.listShares(host)
		if(!host.shares.length) return
		processing.upsertHost(host)
	}

	await Promise.all(hosts.map(task))
	processing.insertScan('discoverNewHosts', startTime, Date.now() - startTime)
}

/**
 * Pings all known hosts in the database and records their online status
 */
async function pingKnownHosts() {
	// debug('starting pingknownhosts')
	const startTime = Date.now()

	const hosts = processing.findHosts()
	const task = async host => {
		await discovery.ping(host)
		if(!host.online) return
		processing.updateLastseen(host.id)
	}

	await Promise.all(hosts.map(task))
	processing.insertScan('pingKnownHosts', startTime, Date.now() - startTime)
}

/**
 * Indexes all know hosts and records it in the db
 */
async function indexKnownHosts() {
	// debug('starting indexknownhosts')
	const startTime = Date.now()

	const hosts = processing.findHosts()
	const hostTask = async host => {
		await discovery.listShares(host)
		if(!host.shares.length) {debug('no shares on', host.hostname); return}
		await Promise.all(host.shares.map(share => shareTask(host, share)))
	}
	const shareTask = async (host, share) => {
		// debug('starting share task on',host.hostname,share.name)
		// upsert share to make sure it exists
		processing.upsertShare(host.id, share)
		// get the id of that share
		let shareId = processing.findShareByName(share.name)
		if(!shareId) {debug('no share id returned'); return}
		shareId = shareId.id

		// remove all files of this share
		processing.removeFiles(shareId)

		// create a new event emitter to process data in batches
		const indexEmitter = new events.EventEmitter()
		indexEmitter.on('data', indexedFiles => {
			// insert into database
			processing.insertFiles(shareId, indexedFiles)
		})
		// start indexing and wait for completion
		await discovery.indexShare(host, share, indexEmitter)
		// update share information
		processing.upsertShare(host.id, share)
	}

	await Promise.all(hosts.map(hostTask))
	processing.insertScan('indexKnownHosts', startTime, Date.now() - startTime)
}

/**
 * Does post processing on indexed hosts, such as building keyword indexes
 */
async function postProcessing() {

	// return processing.buildFileIndex()
	// 	.then(processing.buildDirectoryIndex)
	// 	.then(processing.buildKeywordIndex)
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
	info('Ping hosts: started')
	const timer = startTimer()
	queue.add(pingKnownHosts)
		.then(() => timer.done('Ping hosts: completed'))
		.catch(err => warn('Ping hosts: failed', err.message))
}

/**
 * Runs a full discovery by finding new hosts, scanning who is online, indexing all their shared
 * folders and doing some postprocesing
 */
exports.runFullDiscovery = function() {
	info('Full discovery: started')
	const timer = startTimer()
	queue.addAll([
		discoverNewHosts,
		indexKnownHosts,
		postProcessing
	]).then(() => timer.done('Full discovery: completed'))
		.catch(err => warn('Full discovery: failed', err))
}
