const netping = require('net-ping')
const async = require('async')
const dns = require('dns')
const {spawn} = require("child_process")
const iprange = require('iprange')
const winston = require('winston')
const {info, warn, debug, startTimer} = winston
const PythonShell = require('python-shell')

const smbparser = require('./smb/smbparser')


const smblogger = new (winston.Logger)({
	level: 'debug',
	transports: [
		new (winston.transports.File)({filename: 'logs/smberrors.log'})
	]
})

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
			debug(`pinging finished. ${nodes.length} nodes left`)
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
			debug(`reverse lookup finished. ${nodes.length} left`)
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
// TODO recode in pure javascript
// TODO check if a share is accessible and otherwise ignore
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
					nodes = nodes.filter(n => n.shares.length)
					debug(`listing shares finished. ${nodes.length} left`)
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
		let queue = async.queue(indexShare, options.threads.network)

		timer = startTimer()
		scanresults = []

		queue.drain = () => {
			// do stuff on done
			timer.done('indexing done')
			console.table(scanresults)
			//totalSize = scanresults.reduce((sum, sr) => sum + sr.size)
			//totalFiles = scanresults.reduce((sum, sr) => sum + sr.files + sr.directories)
			//debug(totalSize,totalFiles)
			resolve()
		}

		nodes.forEach(n => n.shares.forEach(s => {
			queue.push({node: n, share: s, datacallback: datacallback}, (err, result) => {
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

function indexShare({node, share, datacallback}, callback) {
	let files = 0
	let directories = 0
	let errors = 0
	let size = 0

	const session = smbparser.session(node.ip, share)

	let queue = async.queue(async.timeout(listFiles, 10000))

	queue.drain = () => {
		session.close()
		const scanresult = {name: node.hostname, share, files, directories, errors, size}
		debug(scanresult)
		callback(null, scanresult)
	}

	queue.push('', resultHandle)

	// basically a wrapper for smbparser.listPath from promise to callback
	function listFiles(path, cb) {
		session.listPath(path)
			.then(res => {
				cb(null,{path: path,files: res})
			})
			.catch(err => {
				cb({path: path, error: err})
			})
	}

	function resultHandle(err, res) {
		if(err) {
			errors++
			smblogger.error(node.hostname, share, err.path, err.error)
		} else {
			for(file of res.files) {
				if(file.directory) {
					directories++
					queue.push(res.path + file.filename + '\\', resultHandle)
				} else {
					files++
					size += file.size
					path = res.path.replace(/\\/g, '/').slice(0, -1)
					datacallback({node: node, share: share, path: path, file: file})
				}
			}
		}
	}
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
				debug(`python ${arguments.join(' ')} -> exit code ${code} -> output: `, output)
				reject(new Error('Python script crashed'))
			} else {
				const parsedOutput = JSON.parse(output)
				resolve(parsedOutput)
			}
		})
	})
}