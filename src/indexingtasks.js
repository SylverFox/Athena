const discovery = require('./discovery')
const winston = require('winston')

function IndexingTasks(config) {
	this.config = config.discovery;
}

IndexingTasks.prototype.discoverNewHosts = function() {
	winston.log('info', 'starting new host discovery')
}

IndexingTasks.prototype.pingKnownHosts = function() {
	winston.log('info', 'starting pinging hosts')
}

IndexingTasks.prototype.indexKnownHosts = function() {
	winston.log('info', 'starting indexing known hosts')
}

module.exports = IndexingTasks