const events = require('events')
const {info, warn, debug, startTimer} = require('winston')
const PQueue = require('p-queue')
const config = require('config')
const iprange = require('iprange')

const discovery = require('./discovery')
const db = require('./models')

const queue = new PQueue({concurrency: 1})

/** TASKS **/

/**
 * Discovers new hosts by pinging the entire range, look up their hostnames and listing their shares
 */
async function discoverNewHosts() {
  // debug('starting discovernewhosts')
  const starttime = new Date()

  const hostrange = iprange(config.discovery.range)
	
  const task = async ip => {
    const online = await discovery.ping(ip)
    if(!online) return
    const hostname = await discovery.reverseLookup(ip)
    if(!hostname) return
    const shares = await discovery.listShares(ip)
    if(!shares.length) return
		
    const [newhost] = await db.Host.findOrCreate({
      where: { ip },
      defaults: { ip, hostname },
    })
    // set hostname if it has been changed since last scan
    newhost.set('hostname', hostname)

    for(let share of shares) {
      await db.Share.findOrCreate({
        where: { name: share, HostId: newhost.id }
      })
    }
  }

  await Promise.all(hostrange.map(task))
  await db.Scan.create({
    task: 'discoverNewHosts',
    starttime: starttime,
    runtime: Date.now() - starttime
  })
}

/**
 * Pings all known hosts in the database and records their online status
 */
async function pingKnownHosts() {
  // debug('starting pingknownhosts')
  const starttime = new Date()

  const task = async host => {
    const online = await discovery.ping(host)

    if(online) {
      host.set('lastseen', new Date())
      host.save()
    }
  }

  const hosts = await db.Host.findAll()	
  await Promise.all(hosts.map(task))

  await db.Scan.create({
    task: 'pingKnownHosts',
    starttime: starttime,
    runtime: Date.now() - starttime
  })
}

/**
 * Indexes all know hosts and records it in the db
 */
async function indexKnownHosts() {
  // debug('starting indexknownhosts')
  const starttime = new Date()

  const hosts = await db.Host.findAll()

  const hostTask = async host => {
    // update shares list
    let shares = await discovery.listShares(host.ip)
    if(!shares.length) {
      debug('no shares on', host.hostname)
      return
    }

    // find or create in DB
    let newshares = []
    for(let share of shares) {
      const [newshare] = await db.Share.findOrCreate({
        where: { name: share, HostId: host.id }
      })
      newshares.push(newshare)
    }

    await Promise.all(newshares.map(share => shareTask(host, share)))
  }

  const shareTask = async (host, share) => {
    debug('starting share task on', host.hostname, share.name)

    share.removeFiles()

    // create a new event emitter to process data in batches
    const indexEmitter = new events.EventEmitter()
    let size = 0, filecount = 0
    indexEmitter.on('data', indexedFiles => {
      const files = indexedFiles.filter(f => !f.isDirectory)
      size += files.reduce((a,b) => a + b.size, 0)
      filecount += files.length

      // append share id
      indexedFiles = indexedFiles.map(f => {
        f.ShareId = share.id
        return f
      })
      // insert into database
      db.File.bulkCreate(indexedFiles)
    })
    // start indexing and wait for completion
    await discovery.indexShare(host, share, indexEmitter)
    // update share information
    share.set('size', size)
    share.set('filecount', filecount)
    share.save()
  }

  await Promise.all(hosts.map(hostTask))
  await db.Scan.create({
    task: 'indexKnownHosts',
    starttime: starttime,
    runtime: Date.now() - starttime
  })
}

/**
 * Does post processing on indexed hosts, such as building keyword indexes
 */
async function postProcessing() {

  // return processing.buildFileIndex()
  // 	.then(processing.buildDirectoryIndex)
  // 	.then(processing.buildKeywordIndex)
}

/** PUBLIC FUNCTIONS **/

/**
 * Adds a job to the queue that pings all known hosts and updates their status in the database
 */
exports.pingHosts = function() {
  info('Ping hosts: started')
  const timer = startTimer()
  queue.add(pingKnownHosts)
    .then(() => timer.done('Ping hosts: completed'))
    .catch(err => warn('Ping hosts: failed', err.message))
}

/**
 * Runs a full discovery by finding new hosts, scanning who is online, indexing all their shared
 * folders and doing some postprocesing
 */
exports.runFullDiscovery = function() {
  info('Full discovery: started')
  const timer = startTimer()
  queue.addAll([
    discoverNewHosts,
    indexKnownHosts,
    postProcessing
  ]).then(() => timer.done('Full discovery: completed'))
    .catch(err => warn('Full discovery: failed', err))
}
