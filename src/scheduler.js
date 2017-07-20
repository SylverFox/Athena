const IndexingTasks = require('./indexingtasks')
const schedule = require('node-schedule')

module.exports.init = function(config) {
	const options = config.scheduling
	const indexer = new IndexingTasks(config.discovery)

	schedule.scheduleJob(options.discoverTime, () => indexer.discoverNewHosts(options))
	schedule.scheduleJob(options.pingTime, () => indexer.pingKnownHosts(options))
	schedule.scheduleJob(options.indexTime, () => indexer.indexKnownHosts(options))
}