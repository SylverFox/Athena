const netping = require('net-ping')
const async = require('async')
const dns = require('dns')
const {spawn} = require("child_process")
const iprange = require('iprange')
const {log} = require('winston')

const smbparser = require('./smb/smbparser')

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
	return new Promise((resolve, reject) => {
		const shCount = options.threads.script || 10
		let found = 0

		// create an array of shells
		let shells = []
		for(let i = 0; i < shCount; i++) {
			shells.push(new PythonShell('src/python/listshares_interactive.py'))
			shells[i].on('message', msg => {
				const result = JSON.parse(msg)
				nodes.find(x => x.hostname === result.hostname).shares = result.shares
				
				if(++found === nodes.length) {
					resolve({nodes: nodes, options: options})
				}
			})
		}

		// divide tasks over shells
		for(let n = 0; n < nodes.length; n++) {
			shells[n%shCount].send(nodes[n].hostname)
		}

		// close all shells
		shells.forEach(shell => shell.end())
	})
}

exports.indexHosts = function({nodes, options}, datacallback) {
	return new Promise((resolve, reject) => {
		function listPathOnTarget({smb2session, path, jobdata}, callback) {
			smb2session.listPath(path).then(res => callback(null, res, jobdata)).catch(callback)
		}

		function handleResult(err, res, jobdata) {
			if(!err) {
				res.forEach(file => {
					if(file.directory) {
						// add directory to queue
						queue.push({
							smb2session: this.data.smb2session,
							path: this.data.path + file.filename + '\\',
							jobdata: jobdata
						}, handleResult)
					} else {
						// replace backslashes with forward slashes and strip last slash
						path = this.data.path.replace(/\\/g, '/').slice(0, -1)
						datacallback({node: jobdata.node, share: jobdata.share, path: path, file: file})
					}
				})
			} else if(!smbparser.commonerrors.includes(err.code))
				log('debug', 'encountered uncommon error: ',err.code)
		}
	
		let queue = async.queue(listPathOnTarget, options.threads.network || 10)

		queue.drain = () => resolve()

		nodes.forEach(n => n.shares.forEach(s => {
			const session = smbparser.session(n.ip, s)
			queue.push({
				smb2session: session,
				path: '',
				jobdata: {node: n, share: s}
			}, handleResult)
		}))
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