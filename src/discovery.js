const dns = require('dns')
const util = require('util')
const config = require('config')
const tcpping = require('tcp-ping')
const smbEnumerateShares = require('smb-enumerate-shares')
const PQueue = require('p-queue')
const iprange = require('iprange')
const winston = require('winston')
const {warn, debug} = winston

const Smbclient = require('./smb/smbclient')
const processing = require('./processing')

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
// throttled promise queue to limit network connections
const queue = new PQueue({concurrency: config.discovery.threads})

/**
 * prepares objects for the discovery pipeline based on the iprange in the config
 */
exports.build = async () => iprange(config.discovery.range).map(ip => ({ip: ip}))

/**
 * Pings the given host on the specified port to check if it is online and the port is accessible
 * @param {object} host
 * @param {number} port
 */
exports.ping = async function(host, port = 445) {
	const options = {
		address: host.ip,
		port: port,
		timeout: config.discovery.ping.timeout,
		attempts: config.discovery.ping.attempts		
	}
	host.online = await queue.add(() => pingHost(options))
		.then(res => res.min !== undefined)
		.catch(err => {
			debug(err) // TODO remove
			return false
		})
	return host
}

/**
 * Does a reverse lookup on the specified host.
 * @param {object} host
 */
exports.reverseLookup = async function(host) {
	host.hostname = await queue.add(() => dnsReverse(host.ip))
		.then(hostnames => hostnames[0])
		.catch(err => debug(err))
	return host
}

/**
 * Lists the SMB shares of a host.
 * @param {object} host
 */
exports.listShares = async function(host) {
	host.shares = await queue.add(() => smbEnumerateShares({host: host.ip, timeout: 10000}))
		.then(shares => shares.filter(s => !s.name.endsWith('$')).map(s => ({name: s.name})))
		.catch(err => {
			debug(host.ip, err.message) // TODO remove
			return []
		})
	return host
}

/**
 * Indexes a host by listing all files and folders within the available shares
 * @param {object} host
 */
exports.indexHost = async function(host) {
	for(let share of host.shares) {
		const client = new Smbclient(host.ip, share.name)
		const result = await queue.add(() => indexDirectoryRecursive(client, ''))
			.then(result => {
				// debug(host.hostname, share.name, result.size, result.index.length)
				// for(let item of result.index) {
				// 	debug(item.path, item.filename, item.size)
				// }
				return result
			})
			.catch(err => {
				debug(host.hostname, share.name, err.message)
				return {size: 0, index: null}
			})
		share.size = result.size
		share.index = result.index
		client.close()
	}
	return host
}

/**
 * Recursively indexes a share on a host using the provided Smbclient. Starting path option is the
 * first entry point on the share. Return an object containing the total size of indexed files and
 * the index, an array of objects.
 * @param {Smbclient} client 
 * @param {string} path 
 */
async function indexDirectoryRecursive(client, path) {
	let size = 0
	let index = []

	let files = []
	try {
		files = await client.readdir(path)
	} catch(err) {
		smblogger.error(err)
	}

	// sort by files first, then alphabetically
	files.sort((a,b) => a.isDirectory - b.isDirectory || a.filename.localeCompare(b.filename))

	for(let file of files) {
		if(file.isDirectory) {
			const subindex = await indexDirectoryRecursive(client, path + file.filename + '\\')
			size += subindex.size
			file.size = subindex.size
			index.push(Object.assign({path}, file))
			index = index.concat(subindex.index)
		} else {
			size += file.size
			index.push(Object.assign({path}, file))
		}
	}

	return {size, index}
}
