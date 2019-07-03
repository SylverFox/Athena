const winston = require('winston')

const db = require('../models')
const discovery = require('../discovery')

/**
 * Pings all known hosts in the database and records their online status
 */
module.exports = async function pingKnownHosts() {
  winston.debug('starting ping_known_hosts')
  const starttime = new Date()

  const task = async host => {
    const online = await discovery.ping(host.ip)
    if(online) {
      host.set('lastseen', new Date())
      await host.save()
    }
  }

  const hosts = await db.Host.findAll()
  await Promise.all(hosts.map(task))

  await db.Scan.create({
    task: 'pingKnownHosts',
    starttime: starttime,
    runtime: Date.now() - starttime
  })
  winston.debug('finished ping_known_hosts')
}