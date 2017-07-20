const netping = require('net-ping');
const async = require('async');
const dns = require('dns');
const {exec} = require("child_process");
const iprange = require('iprange');

// TODO logging

exports.build = function(options) {
	return new Promise((resolve, reject) => {
		options.threads = options.threads || 100
		options.minimize = options.minimize || true

		if(!options.range) {
			reject('options must have a range parameter')
			return
		}
		
		const nodes = iprange(options.range).map(ip => ({ip: ip}))
		resolve({nodes: nodes, options: options})
	})
}

exports.ping = function({nodes, options}) {
	let session = netping.createSession();
	
	return new Promise((resolve, reject) => {
		let queue = async.queue((target, callback) => session.pingHost(target, callback), options.threads);
		queue.drain = () => {
			session.close();
			if(options.minimize)
				nodes = nodes.filter(node => node.online);

			resolve({nodes: nodes, options: options})
		};

		for(let node of nodes) {
			queue.push(node.ip, (err, target) => {
				node.online = err ? false : true
			});
		}
	});
}

exports.reverseLookup = function({nodes, options}) {
	return new Promise((resolve, reject) => {
		let queue = async.queue((target, callback) => dns.reverse(target, callback), options.threads);

		queue.drain = () => {
			if(options.minimize)
				nodes = nodes.filter(node => node.hostname);
			resolve({nodes: nodes, options: options});
		}

		for(let node of nodes) {
			queue.push(node.ip, (err, hostnames) => {
				if(err) node.hostname = null;
				else node.hostname = hostnames[0].substring(0,hostnames[0].indexOf('\.'));
			});
		}
	});
}

exports.listShares = function({nodes, options}) {
	function listSharesFromTarget(target, callback) {
		let proc = exec('python src/python/listshares.py '+target);
		proc.stderr.pipe(proc.stdout);
		let output = '';

		proc.stdout.on('data', data => output += data.toString());

		proc.on('exit', code => {
			if(code > 0) callback(new Error('python script "listshares.py" exited with code: '+code)); // most likely no shares
			else callback(null, JSON.parse(output));
		});
	}

	return new Promise((resolve, reject) => {
		let queue = async.queue(listSharesFromTarget, options.threads);

		queue.drain = () => {
			if(options.minimize)
				nodes = nodes.filter(node => node.shares);
			resolve({nodes: nodes, options: options});
		}

		for(let node of nodes) {
			queue.push(node.hostname, (err, shares) => {
				if(err || shares.length === 0) node.shares = null;
				else node.shares = shares;
			});
		}
	});
}