let config = require('./src/config.default');

/** WEBSERVER **/

// disallows access from ip's outside the UT range
config.webserver.allowedHosts = ['::1','127.0.0.1', '130.89.0.0/16', '2001::67c::2564::/48']
// hostname for this server
config.webserver.hostname = 'localhost'
// port this webserver binds to
config.webserver.port = 8000

/** DISCOVERY **/

// ip range to scan for shares
config.discovery.range = '130.89.160.0/20'
// maximum number of threads for each of the discovery tasks
// increasing the number of threads increases discovery speed, but can cause
// problems, use with care
config.discovery.threads.network = 100 // threads that use network connection
config.discovery.threads.script = 50 // threads that run an external script
// minimize number of hosts when discovering
// setting this to true will drop every server from the output when it does
// not respond during any of the discovery tasks
config.discovery.minimize = true

/** SCHEDULING **/

// time to discover new hosts in cron format (default = daily at midnight)
config.scheduling.discoverTime = '0 0 * * *'
// time to ping known hosts in cron format (default = every 5 minutes)
config.scheduling.pingTime = '*/5 * * * *'
// time to index known hosts in cron format (default = daily at 1 am)
config.scheduling.indexTime = '0 1 * * *'

/** DATABASE **/

// MongoDB hostname
config.database.host = 'localhost'
// MongoDB database name
config.database.name = 'athena'
// MongoDB database port
config.database.port = 27017
// MongoDB username
config.database.username = process.env.MONGO_USER || ''
// MongoDB password
config.database.password = process.env.MONGO_PASS || ''

/** LOGGING **/

config.loglevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug'
config.loglocation = 'logs'

module.exports = config;