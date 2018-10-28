const dns = require('dns')
const util = require('util')

const config = require('config')
const tcpping = require('tcp-ping')
const async = require('async')
const PQueue = require('p-queue')

const iprange = require('iprange')
const winston = require('winston')
const {warn, debug} = winston
const PythonShell = require('python-shell')

const smbparser = require('./smb/smbparser')
const processing = require('./processing')

const OPTS = config.discovery

// custom logger for errors in smb scanning
const smblogger = new (winston.Logger)({
	level: 'debug',
	transports: [
		new (winston.transports.File)({filename: 'logs/smberrors.log', timestamp: true})
	]
})

// promisified version of the tcp ping function
const pingHost = util.promisify(tcpping.ping)
// promisified version of dns.reverse
const dnsReverse = util.promisify(dns.reverse)

/**
 * prepares objects for the discovery pipeline based on the iprange in the config
 */
exports.build = async () => iprange(OPTS.range).map(ip => ({ip: ip}))

/**
 * Pings the given hosts on the specified port to check if it is online and the port is accessible
 * Returns a promise that is resolved when all hosts have been pinged
 * @param {object[]} hosts
 * @param {number} port
 */
exports.ping = async function(hosts, port = 139) {
	debug(`pinging ${hosts.length} hosts`)

	let queue = new PQueue({concurrency: OPTS.threads.network})
	
	for(let host of hosts) {
		queue.add(() => pingHost({
			address: host.ip,
			port: port,
			timeout: OPTS.ping.timeout,
			attempts: OPTS.ping.attempts
		}).then(res => {
			host.online = res.min !== undefined
		}))
	}

	await queue.onIdle()

	hosts = hosts.filter(h => h.online)
	debug(`pinging finished. ${hosts.length} hosts online`)
	return hosts
}

/**
 * Does a reverse lookup on the specified hosts. Returns a promise that resolves into all hosts that have a hostname
 * @param {object[]} hosts
 */
exports.reverseLookup = async function(hosts) {
	debug(`doing reverse lookup on ${hosts.length} ip's`)

	let queue = new PQueue({concurrency: OPTS.threads.network})

	for(let host of hosts) {
		queue.add(() => dnsReverse(host.ip).then(hostnames => host.hostname = hostnames[0]))
	}

	await queue.onIdle()
	hosts = hosts.filter(h => h.hostname)
	debug(`reverse lookup finished. found ${hosts.length} hostnames`)
	return hosts
}

// TODO recode in pure javascript
// TODO check if a share is accessible and otherwise ignore
/**
 * Lists the SMB shares of a host. Currently uses a shell executing a python script
 * @param {object[]} hosts
 */
exports.listShares = async function(hosts) {
	debug(`listing shares on ${hosts.length} hosts`)

	return new Promise(resolve => {
		const shCount = OPTS.threads.script
		let found = 0

		// create an array of shells
		let shells = []
		for(let i = 0; i < shCount; i++) {
			shells.push(new PythonShell('src/python/listshares.py'))
			shells[i].on('message', msg => {
				const result = JSON.parse(msg)
				hosts.find(x => x.ip === result.ip).shares = result.shares.map(s => ({name: s}))
				
				if(++found === hosts.length) {
					hosts = hosts.filter(n => n.shares.length)
					const totalshares = hosts.map(h => h.shares.length).reduce((a,b) => a+b, 0)
					debug(`listing shares finished. ${hosts.length} have shares, with a total of ${totalshares} shares`)
					
					resolve(hosts)
				}
			})
		}

		// divide tasks over shells
		for(let n = 0; n < hosts.length; n++) {
			shells[n%shCount].send(hosts[n].ip)
		}
		// close all shells
		shells.forEach(shell => shell.end())
	})
}

/**
 * Indexes a host by listing all files and folders within the available shares
 * @param {object[]} hosts
 */
exports.indexHosts = async function(hosts) {
	debug('starting indexing on '+hosts.length+' hosts')

	let queue = new PQueue({concurrency: OPTS.threads.network})

	for(let host of hosts) {
		for(let share of host.shares) {
			debug(host.ip, share.name)
			let session = smbparser.createSession(host.ip, share.name)

			queue.add(() => {
				smbparser.listPath({ip: host.ip, share: share.name})
					.then(result => debug(result))
					.catch(err => debug(err))
			})
			
			await queue.onIdle()		
			session.close()
		}
		
	}
}

exports.indexHosts_OLD = function(hosts) {	
	return new Promise(resolve => {
		let queue = async.queue(indexShare, OPTS.threads.network)
		let scanresults = []

		queue.drain = () => {
			const totalSize = scanresults.reduce((sum, sr) => sum + sr.size, 0)
			const totalFiles = scanresults.reduce((sum, sr) => sum + sr.files, 0)
			const totalDirs = scanresults.reduce((sum, sr) => sum + sr.directories, 0)
			const totalErrs = scanresults.reduce((sum, sr) => sum + sr.errors, 0)
			debug(`total size: ${totalSize}, total files: ${totalFiles}, total directories: ${totalDirs}, total errors: ${totalErrs}`)

			scanresults = null
			resolve()
		}

		hosts.forEach(n => n.shares.forEach(s => {
			queue.push({node: n, share: s.name}, (err, result) => {
				if(err)
					warn(`timeout while scanning ${s} on ${n.hostname}`, err)
				else {
					scanresults.push(result)
					debug(`${queue.running()} jobs running, ${queue.length()} waiting`)
				}
			})
		}))
	})
}

function indexShare({node, share}, callback) {
	let files = 0
	let directories = 0
	let errors = 0
	let size = 0

	let session = smbparser.session(node.ip, share)

	let queue = async.queue(async.timeout(listFiles, 10000))

	queue.drain = () => {
		session.close()
		session = null
		const scanresult = {name: node.hostname, share, files, directories, errors, size}
		debug(scanresult)
		processing.updateNodeInfo(scanresult)
			.catch(err => warn('database insertion failed', err))
		callback(null, scanresult)
	}

	queue.push('', resultHandle)

	// basically a wrapper for smbparser.listPath from promise to callback
	function listFiles(path, cb) {
		smbparser.listPath(session, path)
			.then(res => cb(null, {path: path, files: res}))
			.catch(err => cb(err, {path: path, files: null}))
	}

	function resultHandle(err, res) {
		if(err) {
			errors++
			smblogger.error(node.hostname, share, res ? res.path : '', err)
			// handle an error
			if(err.code === 'STATUS_USER_SESSION_DELETED') {
				// TODO retry?
			} else if(err.code === 'STATUS_ACCESS_DENIED') {
				// this is fine
			} else if(err.code === 'STATUS_LOGON_FAILURE') {
				// TODO
			} else if(err.code === 'STATUS_BAD_NETWORK_NAME') {
				// TODO
			} else if(err.code === 'STATUS_NO_LOGON_SERVERS') {
				// TODO
			} else if(err.code === 'STATUS_OBJECT_NAME_NOT_FOUND') {
				// TODO
			} else if(err.code === 'ETIMEDOUT') {
				// this is fine
			} else {
				warn('got unknown error: ', err)
			}
		} else {
			for(let file of res.files) {
				if(file.directory) {
					directories++
					queue.push(res.path + file.filename + '\\', resultHandle)
				} else {
					files++
					size += file.size
					const path = res.path.replace(/\\/g, '/').slice(0, -1)
					const data = {node: node, share: share, path: path, file: file}
					processing.insertNewFile(data)
						.catch(err => warn('database insertion failed', err))
				}
			}
		}
	}
}
