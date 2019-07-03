const winston = require('winston')
const events = require('events')

const db = require('../models')
const discovery = require('../discovery')

const ACTIVE = { updatedAt: { [db.Sequelize.Op.gt]: Date.now() - 5 * 60 * 1000 } }

const task = async (host, share) => {
  winston.debug(`starting share task on ${host.hostname}/${share.name}`)

  // remove all previous files
  db.File.destroy({ where: { ShareId: share.id } })

  // create a new event emitter to process data in batches
  const indexEmitter = new events.EventEmitter()
  let size = 0, filecount = 0
  indexEmitter.on('data', async indexedFiles => {
    const files = indexedFiles.filter(f => !f.isDirectory)
    size += files.reduce((a,b) => a + b.size, 0)
    filecount += files.length

    // append share id
    for(let file of indexedFiles) {
      file.ShareId = share.id
    }
    // insert into db
    await db.File.bulkCreate(indexedFiles)
  })
  // start indexing and wait for completion
  await discovery.indexShare(host, share, indexEmitter)
  // update share information
  share.set('size', size)
  share.set('filecount', filecount)
  await share.save()
}

/**
 * Indexes all know hosts and records it in the db
 */
module.exports = async function indexKnownHosts() {
  winston.debug('starting index_known_hosts')
  const starttime = new Date()

  const hosts = await db.Host.findAll({
    where: ACTIVE,
    include: [{
      model: db.Share, where: ACTIVE
    }]
  })

  await Promise.all(hosts.map(async host => {
    let size = 0, files = 0
    await Promise.all(host.Shares.map(async share => {
      await task(host, share)
      size += share.size
      files += share.filecount
    }))
    await db.HostHistory.create({ size, files, HostId: host.id })
  }))
  await db.Scan.create({
    task: 'indexKnownHosts',
    starttime: starttime,
    runtime: Date.now() - starttime
  })
  winston.debug('finished index_known_hosts')
}