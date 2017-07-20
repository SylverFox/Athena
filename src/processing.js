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
	const doc = {
		task: task,
		starttime: start,
		runtime: runtime
	}
	return scansDB.insert(doc)
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