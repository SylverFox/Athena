const dns = require('dns')
const util = require('util')
const config = require('config')
const tcpping = require('tcp-ping')
const smbEnumerateShares = require('smb-enumerate-shares')
const smbEnumerateFiles = require('smb-enumerate-files')
const {default: PQueue} = require('p-queue')
const winston = require('winston')

// custom logger for errors in smb scanning
const smblogger = winston.createLogger({
  level: config.logging.level,
  transports: [
    new winston.transports.File({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      filename: config.logging.location+'/smberrors.log',
    })
  ]
})

// promisified version of the tcp probe function
const pingHost = util.promisify(tcpping.probe)
// promisified version of dns.reverse
const dnsReverse = util.promisify(dns.reverse)
// throttled promise queue to limit network connections
const queue = new PQueue({concurrency: config.discovery.threads})

/**
 * Pings the given host on the specified port to check if it is online and the port is accessible
 * @param {string} ip
 * @param {number} port
 */
exports.ping = function(ip, port = 445) {
  const online = queue.add(() => pingHost(ip, port))
    .then(res => res)
    .catch(() => false)
	
  return online
}

/**
 * Does a reverse lookup on the specified host.
 * @param {string} ip
 */
exports.reverseLookup = function(ip) {
  const hostname = queue.add(() => dnsReverse(ip))
    .then(hostnames => hostnames[0])
    .catch(err => winston.debug('reverse lookup error: '+err.message))
  return hostname
}

/**
 * Lists the SMB shares of a host.
 * @param {object} ip
 */
exports.listShares = function(ip) {
  const shares = queue.add(() => smbEnumerateShares({host: ip, timeout: 10000}))
    .then(shares => shares.filter(s => !s.name.endsWith('$')).map(s => s.name))
    .catch(err => {
      smblogger.debug(`list shares failed on ${ip}: ${err.message}`)
      return []
    })
  return shares
}

/**
 * Indexes a host by listing all files and folders within the available shares
 * Returns the host with each share now has a name, size, filecount and full index
 * @param {object} host
 * @deprecated
 */
exports.indexHost = async function(host) {
  for(let share of host.shares) {
    const smbsession = smbEnumerateFiles.createSession({
      host: host.ip,
      share: share.name
    })

    try {
      await smbsession.connect()
      const result = await queue.add(() => 
        indexDirectoryRecursive(smbsession, '')
      ).then(result => {
        const fullname = host.hostname+'/'+share.name
        winston.debug(`${fullname} files: ${result.index.length} total size: ${result.size}`)
        return result
      }).catch(err => {
        winston.debug(`${host.hostname} ${share.name} ${err.message}`)
        return {size: 0, index: []}
      })
      // hook size, filecount and index to the share
      Object.assign(share, result)
      await smbsession.close()
    } catch(err) {
      smblogger.error('indexing host failed', {
        hostname: host.hostname,
        share: share.name,
        error: err.message,
        stack: err.stack
      })
      continue
    }
  }
  return host
}

// TODO doc
exports.indexShare = async function(host, share, indexEmitter) {
  const smbsession = smbEnumerateFiles.createSession({host: host.ip, share: share.name})
  try {
    await smbsession.connect()
    const result = await queue.add(() => indexDirectoryRecursive(smbsession, indexEmitter, ''))
      .then(res => {
        const fullname = host.hostname+'/'+share.name
        winston.debug(`${fullname} files: ${res.filecount} total size: ${res.size}`)
        return res
      }).catch(err => {
        winston.debug(`${host.hostname} ${share.name} ${err.message}`)
        return {size: 0, filecount: 0}
      })
    Object.assign(share, result)
    await smbsession.close()
  } catch(err) {
    smblogger.error('indexing share failed', {
      hostname: host.hostname,
      share: share.name,
      error: err.message,
      stack: err.stack
    })
  }
  return host
}

/**
 * Recursively indexes a share on a host using the provided Smbsession. Starting path option is the
 * first entry point on the share. Uses the provided emitter to emit files found on the path
 * @param {object} session 
 * @param {string} path 
 * @deprecated
 */
async function indexDirectoryRecursive(session, emitter, path) {
  let size = 0, filecount = 0

  let files = []
  try {
    files = await session.enumerate(path)
    files = files.map(f => ({
      filename: f.filename,
      size: f.size,
      isDirectory: f.directory,
      path: path
    }))
  } catch(err) {
    smblogger.error('Recursive directory indexing failed', {
      host: session.options.host,
      share: session.options.share,
      error: err.message,
      stack: err.stack
    })
  }

  for(let file of files) {
    if(file.isDirectory) {
      const subindex = await indexDirectoryRecursive(session, emitter, path + file.filename + '\\')
      file.size = subindex.size
      size += subindex.size
      filecount += subindex.filecount
    } else {
      size += file.size
      filecount += 1
    }
  }

  // emit files and folders on this path
  emitter.emit('data', files)

  return {size, filecount}
}
