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

config.database = {
	// database server hostname
	hostname: 'localhost',
	// database port
	port: 27017
}

config.discovery = {
	// ip range to scan for shares
	range: '130.89.160.0/19',
	// maximum number of network threads
	threads: 300,
	// minimize number of hosts when discovering
	// setting this to true will drop every server from the output when it does
	// not respond to ping or smb packets
	minimize: true
}

module.exports = config;