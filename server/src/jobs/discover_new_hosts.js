const winston = require('winston')
const config = require('config')
const iprange = require('iprange')

const db = require('../models')
const discovery = require('../discovery')

/**
 * Discovers new hosts by pinging the entire range, look up their hostnames and listing their shares
 */
module.exports = async function discoverNewHosts() {
  winston.debug('starting discover_new_hosts')
  const starttime = new Date()

  const hostrange = iprange(config.discovery.range)
  
  const task = async ip => {
    const online = await discovery.ping(ip)
    if(!online) return
    const hostname = await discovery.reverseLookup(ip)
    if(!hostname) return
    const shares = await discovery.listShares(ip)
    if(!shares.length) return

    winston.debug(`host ${ip} with hostname ${hostname} has shares: ${shares}`)
		
    const newhost = await db.Host.findOrCreate({
      where: { ip },
      defaults: { ip, hostname },
    }).then(([instance, created]) => {
      if(!created) {
        // update last seen
        instance.set('lastseen', new Date())
        // update hostname (might be changed since last scan)
        instance.set('hostname', hostname)
        instance.save()
      }
      return instance
    })

    for(let share of shares) {
      await db.Share.findOrCreate({
        where: { name: share, HostId: newhost.id }
      }).then(async ([instance, created]) => {
        if(!created) {
          instance.changed('updatedAt', true)
          await instance.save()
        }
      })
    }
  }

  await Promise.all(hostrange.map(task))
  await db.Scan.create({
    task: 'discoverNewHosts',
    starttime: starttime,
    runtime: Date.now() - starttime
  })
  winston.debug('finished discover_new_hosts')
}