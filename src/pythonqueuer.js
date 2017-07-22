const {log} = require('winston')
const PythonShell = require('python-shell')
const EventEmitter = require('events').EventEmitter
const util = require('util')

function PythonQueuer(options) {
	this.maxShells = options.maxshells
	this.bucketSize = options.bucketsize
	this.script = options.script

	this.shells = []
	this.shellID = 1
	this.jobID = 1

	this.waitingJobs = []

	EventEmitter.call(this)
}

util.inherits(PythonQueuer, EventEmitter)

PythonQueuer.prototype.addJob = function(query, callback) {
	shell = this.findShell()
	if(shell) {
		// add immediately
		const id = this.addShellJob(shell.id, query)
		callback(id)
	} else {
		// add to job queue
		this.waitingJobs.push({query: query, callback: callback})
	}
}

PythonQueuer.prototype.createShell = function() {
	log('debug', 'creating new shell')
	const _shellID = this.shellID++

	let shell = {
		id: _shellID,
		pyshell: new PythonShell(this.script)
		.on('message', (msg) => this.handleResult(_shellID, JSON.parse(msg)))
		.on('close', () => this.closeShell(_shellID)),
		queued: 0,
		ended: false,
		finished: false,
		callbacks: [],
		data: [],
		startTimer: () => {
			setTimeout(() => this.endShell(_shellID), 5000)
		}
	}
	this.shells.push(shell)
	shell.startTimer()
	return shell
}

PythonQueuer.prototype.findShell = function() {
	log('debug', 'finding shell')
	// find shell that has not ended
	availableShell = this.shells.find(s => !s.ended)

	if(availableShell)
		return availableShell
	else if(this.shells.length < this.maxShells)
		// or create a new one
		return this.createShell()
}

PythonQueuer.prototype.endShell = function(id) {
	log('debug', 'ending shell: '+id)
	shell = this.shells.find(s => s.id === id)
	shell.ended = true
	shell.pyshell.end()
}

PythonQueuer.prototype.closeShell = function(id) {
	log('debug', 'closing shell: '+id)
	shellIndex = this.shells.findIndex(s => s.id === id)
	this.shells.splice(shellIndex, 1)

	// if there are more waiting jobs, immediately start a new shell
	if(this.waitingJobs.length) {
		shell = this.createShell()
		for(let x = 0; x < this.bucketsize && this.waitingJobs.length; x++) {
			const job = this.waitingJobs.shift()
			jobid = addShellJob(shell.id, job.query)
			job.callback(jobid)
		}
	}
}

PythonQueuer.prototype.addShellJob = function(id, query) {
	log('debug', 'adding job to shell '+id)
	shell = this.shells.find(s=> s.id === id)

	_jobID = this.jobID++
	shell.pyshell.send(`${_jobID} ${query}`)
	shell.queued++

	if(shell.queued === this.bucketSize) {
		// bucket full
		this.endShell(shell.id)
	}

	return _jobID
}

PythonQueuer.prototype.handleResult = function(shellid, result) {
	jobid = result.id
	data = result.data
	this.emit('result', jobid, data)
}

module.exports = PythonQueuer