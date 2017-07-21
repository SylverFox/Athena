const IndexingTasks = require('./indexingtasks')
const schedule = require('node-schedule')

module.exports.init = function(config) {
	const options = config.scheduling
	const indexer = new IndexingTasks(config.discovery)

	schedule.scheduleJob(options.discoverTime, () => indexer.discoverNewHosts())
	schedule.scheduleJob(options.pingTime, () => indexer.pingKnownHosts())
	schedule.scheduleJob(options.indexTime, () => indexer.indexKnownHosts())
}