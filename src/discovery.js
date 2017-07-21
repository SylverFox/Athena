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
			options.threads.ping || 10)

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
					node.lastseen = Date.now()
				}
			})
		}
	})
}

// reverse dns lookup on node ip's
exports.reverseLookup = function({nodes, options}) {
	return new Promise((resolve, reject) => {
		let queue = async.queue((target, callback) => dns.reverse(target, callback), 
			options.threads.reverselookup || 10)

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
		let proc = spawn('python', ['src/python/listshares.py', target])
		proc.stderr.pipe(proc.stdout)

		let output = ''
		proc.stdout.on('data', data => output += data.toString())

		proc.on('exit', code => {
			if(code > 0) callback(new Error('python script "listshares.py" exited with code: '+code), output) // most likely no shares
			else callback(null, JSON.parse(output))
		})
	}

	return new Promise((resolve, reject) => {
		let queue = async.queue(listSharesFromTarget, options.threads.listshares || 10)

		queue.drain = () => {
			if(options.minimize)
				nodes = nodes.filter(node => node.shares)
			resolve({nodes: nodes, options: options})
			log('debug', `listing shares finished. ${nodes.length} nodes left`)
		}

		for(let node of nodes) {
			queue.push(node.hostname, (err, shares) => {
				if(err || shares.length === 0) node.shares = null
				else node.shares = shares
			})
		}
	})
}

// indexes and populates a tree for a given target
// TODO needs recode
exports.indexHost = function(target) {
	return new Promise((resolve, reject) => {
		if(!target.shares || !target.shares.length) {
			reject('no shares for target')
			return
		}

		log('debug','indexing '+target.hostname)

		let totalTree = []

		target.shares.forEach((share, index) => {
			let proc = spawn('python',['src/python/sharetree.py',target.hostname,share])
			proc.stderr.pipe(proc.stdout)

			let output = ''
			proc.stdout.on('data', data => {
				output += data.toString()
			})

			proc.on('exit', code => {
				if(code > 0) log('debug','something went wrong, most likely the share was not accessible', output)
				else {
					const parsedOutput = JSON.parse(output)

					//log('debug',parsedOutput)
					if(parsedOutput.length)
						totalSize = parsedOutput.map(x => x.size).reduce((sum, val) => sum+val)
					else
						totalSize = 0
					log('debug',`indexed share "${share}" on host "${target.hostname}", total size : ${totalSize} bytes`)

					let thisShare = {
						directory: true,
						size: totalSize,
						filename: share,
						children: parsedOutput
					}
					totalTree.push(thisShare)
				}

				if(index === target.shares.length - 1)
						resolve(totalTree)
			})
		})

	})
}