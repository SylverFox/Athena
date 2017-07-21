var config = {};

// webserver
config.webserver = {
	// disallows access from ip's outside the UT range
	allowedHosts: ['::1','127.0.0.1', '130.89.0.0/16', '2001:67c:2564::/48'],
	// hostname for this server
	hostname: 'athena.student.utwente.nl',
	// port this webserver binds to
	port: 8000
}

config.discovery = {
	// ip range to scan for shares
	range: '130.89.160.0/19',
	// maximum number of threads for each of the discovery tasks
	// increasing the number of threads increases discovery speed, but can cause
	// problems, use with care
	threads: {
		network: 500, // threads that use network connection
		script: 50, // threads that run an external script
	},
	// minimize number of hosts when discovering
	// setting this to true will drop every server from the output when it does
	// not respond to ping or smb packets
	minimize: true
}

config.scheduling = {
	// time to discover new hosts in cron format (default: daily at midnight)
	discoverTime: '0 0 * * *',
	// time to ping known hosts in cron format (default: every 5 minutes)
	pingTime: '*/5 * * * *',
	// time to index known hosts in cron format (default: daily at 1 am)
	indexTime: '0 1 * * *'
}

config.loglevel = 'debug'

module.exports = config;