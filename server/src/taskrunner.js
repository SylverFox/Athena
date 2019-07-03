const winston = require('winston')
const {default: PQueue} = require('p-queue')

const discoverNewHosts = require('./jobs/discover_new_hosts')
const pingKnownHosts = require('./jobs/ping_known_hosts')
const indexKnownHosts = require('./jobs/index_known_hosts')
const postprocessing = require('./jobs/postprocessing')

const queue = new PQueue({concurrency: 1})

/**
 * Runs the given jobs and reports when started/completed under the given name
 * @param {string} name The name of the job
 * @param {array} jobs Array with async jobs to work on
 */
function runJobs(name, jobs) {
  winston.info(`${name} started`)
  const timer = winston.startTimer()
  queue.addAll(jobs)
    .then(() => timer.done({ message: `${name} completed` }))
    .catch(err => winston.warn(`${name} failed -> ${err.message}`))
}

/**
 * Adds a job to the queue that pings all known hosts and updates their status in the database
 */
exports.pingHosts = function() {
  runJobs('Ping hosts', [pingKnownHosts])
}

/**
 * Runs a full discovery by finding new hosts, scanning who is online, indexing all their shared
 * folders and doing some postprocesing
 */
exports.runFullDiscovery = function() {
  runJobs('Full discovery', [
    discoverNewHosts,
    indexKnownHosts,
    postprocessing
  ])
}
