const {log} = require('winston')
const {MongoClient} = require('mongodb')
const monk = require('monk')

const db = monk('localhost/athena')
db.then(() => log('info', 'processor connected to MongoDB'))
db.catch((err) => log('error', 'failed to connect to MongoDB', err))

const nodesDB = db.get('nodes')
const indexDB = db.get('campusnetindex')
const scansDB = db.get('scans')
const keywdDB = db.get('keywords')

exports.insertNewScan = function(task, start, runtime) {
	return scansDB.insert({
		task: task,
		starttime: start,
		runtime: runtime
	})
}

exports.appendNewNodes = function({nodes, options}) {
	return new Promise((resolve, reject) => {
		nodes.forEach((node, index) => {
			nodesDB.update(
				{ip: node.ip},
				{
					$set:node,
					$setOnInsert:{firstseen:Date.now()}
				},
				{upsert: true}
			).then(() => {
				if(index === nodes.length-1)
					resolve()
			}).catch(reject)
		})
	})
}

exports.getNodeIPList = function({nodes, options}) {
	return new Promise((resolve, reject) => {
		nodesDB.find({}, 'ip -_id').then(docs => {
			resolve({nodes: docs, options: options})
		}).catch(reject)
	})
}

exports.updateOnlineStatus = function({nodes, options}) {
	return new Promise((resolve, reject) => {
		nodes.forEach((node, index) => {
			nodesDB.update({ip: node.ip}, {$set:node})
			.then(() => {
				if(index === nodes.length-1)
					resolve()
			}).catch(reject)
		})
	})
}

exports.getNodeShareList = function() {
	return nodesDB.find({}, '-_id ip hostname shares')
}

exports.updateNodeTree = function(node) {
	return nodesDB.update({ip: node.ip}, {$set:{tree: node.tree}})
}

exports.buildFileindex = function() {
	log('debug', 'building file index')

	// TODO

	return new Promise((resolve, reject) => {
		resolve()
	})
}

exports.buildKeywordIndex = function() {
	log('debug', 'building keyword index')

	// TODO

	return new Promise((resolve, reject) => {
		resolve()
	}
}