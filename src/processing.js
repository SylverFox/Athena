const {debug} = require('winston')
const {MongoClient} = require('mongodb')
const monk = require('monk')

const db = monk('localhost/athena')

const nodesDB = db.get('nodes')
const indexDB = db.get('campusnetindex')
const scansDB = db.get('scans')
const keywdDB = db.get('keywords')
const filesDB = db.get('files')

exports.verifyExistingCollections = function() {
	db.create('nodes')
	db.create('campusnetindex')
	db.create('scans')
	db.create('keywords')
	db.create('files')
}

exports.insertNewScan = function(task, start, runtime) {
	return scansDB.insert({
		task: task,
		starttime: start,
		runtime: runtime
	})
}

exports.appendNewNodes = function({nodes, options}) {
	return new Promise((resolve, reject) => {
		let promises = []
		nodes.forEach((node, index) => {
			promises.push(
				nodesDB.update(
					{ip: node.ip},
					{
						$set: node,
						$setOnInsert: {firstseen:Date.now(), seen:[Date.now()], lastseen:Date.now()}
					},
					{upsert: true}
				)
			)
		})

		Promise.all(promises).then(resolve).catch(reject)
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
		let promises = []

		nodes.forEach((node, index) => {
			if(node.online) {
				promises.push(
					nodesDB.update({ip: node.ip},
						{$set: {online: true, lastseen: Date.now()}, $addToSet: {seen: Date.now()}}
					)
				)
			} else {
				promises.push(
					nodesDB.update({ip: node.ip}, {$set: {online: false}})
				)
			}
			
		})

		Promise.all(promises).then(resolve).catch(reject)
	})
}

exports.getNodeShareList = function({nodes, options}) {
	return new Promise((resolve, reject) => {
		//nodesDB.find({online: true}, '-_id ip hostname shares')
		nodesDB.find({online: true}, {fields: {_id:0,ip:1,hostname:1,shares:1}, limit:1, skip:0})
		.then(docs => resolve({nodes: docs, options: options}))
		.catch(reject)
	})
}

exports.emptyFilesCache = function() {
	return filesDB.remove({})
}

exports.insertNewPath = function({node, share, path, file}) {
	const fileToInsert = {
		filename: file.filename,
		size: file.size,
		path: '//' + node.hostname + '/' + share + '/' + path
	}

	return filesDB.insert(fileToInsert)
}

exports.buildFileIndex = function() {
	debug('building file index')
	

	return filesDB.aggregate([
		{$group: {
			_id: {filename: '$filename', size: '$size'},
			filename: {$first: '$filename'},
			size: {$first: '$size'},
			paths: {$push: '$path'}
		}},
		{$out: 'campusnetindex'}
	])
}

exports.buildKeywordIndex = function() {
	debug('building keyword index')

	return filesDB.aggregate([
		{$project: {keywords: {$split: [{$toLower: '$filename'}, '.']}}},
		{$unwind: '$keywords'},
		{$sortByCount: '$keywords'},
		{$out: 'keywords'}
	])
}