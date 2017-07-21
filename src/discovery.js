const netping = require('net-ping')
const async = require('async')
const dns = require('dns')
const {spawn} = require("child_process")
const iprange = require('iprange')
const {log} = require('winston')

// prepares objects for the discovery pipeline based on the options given
exports.build = function(options) {
	return new Promise((resolve, reject) => {
		if(!options) {
			reject('no options given')
			return
		} else if(!options.range) {
			reject('options must have a range parameter')
			return
		}

		options.threads = options.threads || {}
		if(!options.threads.network)
			log('info', 'no network threads specified')
		if(!options.threads.script)
			log('info', 'no script threads specified')
		options.minimize = options.minimize || true
		
		const nodes = iprange(options.range).map(ip => ({ip: ip}))
		resolve({nodes: nodes, options: options})
		log('debug', `finished building. ${nodes.length} nodes left`)
	})
}

// pings nodes and updates their online status
exports.ping = function({nodes, options}) {
	// most server on cnet respond <2 ms, so 100 ms must be sufficient
	let session = netping.createSession({timeout: 100})

	// wrapper function for pingHost, because it fucks up on low timeout and a lot of threads
	function wrapPingHost(target, cb) {
		let hadCB = false
		session.pingHost(target, (e,t) => {
			if(!hadCB) cb(e,t)
			hadCB = true
		})
	}

	return new Promise((resolve, reject) => {
		let queue = async.queue((target, callback) => wrapPingHost(target, callback),
			options.threads.network || 10)

		queue.drain = () => {
			session.close()
			if(options.minimize)
				nodes = nodes.filter(node => node.online)

			resolve({nodes: nodes, options: options})
			log('debug', `pinging finished. ${nodes.length} nodes left`)
		}

		for(let node of nodes) {
			queue.push(node.ip, (err, target) => {
				if(err) {
					node.online = false
				} else {
					node.online = true
				}
			})
		}
	})
}

// reverse dns lookup on node ip's
exports.reverseLookup = function({nodes, options}) {
	return new Promise((resolve, reject) => {
		let queue = async.queue((target, callback) => dns.reverse(target, callback), 
			options.threads.network || 10)

		queue.drain = () => {
			if(options.minimize)
				nodes = nodes.filter(node => node.hostname)
			resolve({nodes: nodes, options: options})
			log('debug', `reverse lookup finished. ${nodes.length} left`)
		}

		for(let node of nodes) {
			queue.push(node.ip, (err, hostnames) => {
				if(err) node.hostname = null
				else node.hostname = hostnames[0].substring(0,hostnames[0].indexOf('\.'))
			})
		}
	})
}

// lists node smb shares
exports.listShares = function({nodes, options}) {
	function listSharesFromTarget(target, callback) {
		runPythonGetJSON(['src/python/listshares.py', target])
		.then(output => callback(null, output))
		.catch(callback)
	}

	return new Promise((resolve, reject) => {
		let queue = async.queue(listSharesFromTarget, options.threads.script || 10)

		queue.drain = () => {
			if(options.minimize)
				nodes = nodes.filter(node => node.shares && node.shares.length)
			resolve({nodes: nodes, options: options})
			log('debug', `listing shares finished. ${nodes.length} nodes left`)
		}

		for(let node of nodes) {
			queue.push(node.hostname, (err, shares) => {
				if(!err) node.shares = shares
			})
		}
	})
}

// indexes and populates a tree for a given target
exports.indexHosts = function({nodes, options}, datacallback) {
	function listPathOnTarget({target, share, path}, callback) {
		runPythonGetJSON(['src/python/listpath.py', target, share, path])
		.then(output => callback(null, {path: path, listing: output}))
		.catch(callback)
	}

	function traverseShare(queue, node, share, path) {
		queue.push({target: node.hostname, share: share, path: path}, (err, {path, listing}) => {
			if(!err) {
				for(let file of listing) {
					if(file.directory) {
						// directroy, add new path to queue
						traverseShare(queue, node, share, path + file.filename + '/')
					} else {
						// file, push back
						datacallback({node: node, share: share, path: path, file: file})
					}
				}
			}
		})
	}

	return new Promise((resolve, reject) => {
		let queue = async.queue(listPathOnTarget, options.threads.script || 10)

		queue.drain = () => resolve()

		for(let node of nodes) {
			log('debug','indexing '+node.hostname)

			if(!node.shares || !node.shares.length) {
				continue
			}

			for(let share of node.shares) {
				// start traversing the share, start at root
				traverseShare(queue, node, share, '/')
			}
		}
	})
}

function runPythonGetJSON(arguments, bulk) {
	return new Promise((resolve, reject) => {
		//log('debug', 'running python ', arguments)
		let proc = spawn('python', arguments)
		proc.stderr.pipe(proc.stdout)

		let output = ''
		proc.stdout.on('data', data => output += data.toString())

		proc.on('exit', code => {
			if(code > 0) {
				log('debug', `python ${arguments.join(' ')} -> exit code ${code} -> output: `, output)
				reject(new Error('Python script crashed'))
			} else {
				const parsedOutput = JSON.parse(output)
				resolve(parsedOutput)
			}
		})
	})
}