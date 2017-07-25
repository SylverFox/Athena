let config = {}

config.webserver = {
	allowedHosts: ['0.0.0.0/0','::/0'],
	hostname: 'localhost',
	port: 80
}

config.discovery = {
	range: '127.0.0.1/32',
	threads: {
		network: 100,
		script: 50,
	},
	minimize: true
}

config.scheduling = {
	discoverTime: '0 0 * * *',
	pingTime: '*/5 * * * *',
	indexTime: '0 1 * * *'
}

config.database = {
	host: 'localhost',
	port: 27017,
	name: 'athena',
	username: process.env.MONGO_USER || '',
	password: process.env.MONGO_PASS || ''
}

config.loglevel = 'info'

module.exports = config;