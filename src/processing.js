const {debug} = require('winston')
const {MongoClient} = require('mongodb')
const monk = require('monk')
const config = require('../config')

const {username,password,host,port,name} = config.database
const creds = username && password ? `${username}:${password}@` : ''
const db = monk(`mongodb://${creds}${host}:${port}/${name}`, {})

const nodesDB = db.get('nodes')
const filesDB = db.get('campusnetfiles')
const foldsDB = db.get('campusnetdirs')
const scansDB = db.get('scans')
const keywdDB = db.get('keywords')
const indexDB = db.get('files')

exports.verifyExistingCollections = function() {
	// TODO put this in taskrunner as startup task

	// verify existing collections
	db.create('nodes')
	db.create('campusnetfiles')
	db.create('campusnetdirs')
	db.create('scans')
	db.create('keywords')
	db.create('files')

	// verify indexes
	filesDB.createIndex({filename: 1})
	foldsDB.createIndex({filename: 1})
	indexDB.createIndex({filename: 1})

}

exports.insertNewScan = function(task, start, runtime) {
	return scansDB.insert({
		task: task,
		starttime: start,
		runtime: runtime
	})
}

exports.appendNewNodes = function({nodes, options}) {
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

	return Promise.all(promises)
}

exports.getNodeIPList = function({nodes, options}) {
	return new Promise((resolve, reject) => {
		nodesDB.find({}, 'ip -_id').then(docs => {
			resolve({nodes: docs, options: options})
		}).catch(reject)
	})
}

exports.updateOnlineStatus = function({nodes, options}) {
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

	return Promise.all(promises)
}

exports.getNodeShareList = function({nodes, options}) {
	return new Promise((resolve, reject) => {
		nodesDB.find({online: true}, '-_id ip hostname shares')
		.then(docs => resolve({nodes: docs, options: options}))
		.catch(reject)
	})
}

exports.emptyFilesCache = function() {
	return indexDB.remove({})
}

exports.insertNewFile = function({node, share, path, file}) {
	const fileToInsert = {
		filename: file.filename,
		size: file.size,
		path: '//' + node.hostname + '/' + share + '/' + path
	}

	return indexDB.insert(fileToInsert)
}

exports.buildFileIndex = function() {
	debug('building file index')

	return indexDB.aggregate([
		{$group: {
			_id: {filename: '$filename', size: '$size'},
			filename: {$first: '$filename'},
			size: {$first: '$size'},
			paths: {$push: '$path'}
		}},
		{$out: 'campusnetfiles'}
	], {allowDiskUse: true})
}

exports.buildDirectoryIndex = function () {
	debug('building directory index')

	const mapFolders = function() {
		const splitPath = this.path.slice(2).split('/')

		for(let f = splitPath.length-1; f > 0; f--) {
			const dir = {
				dirname: splitPath[f],
				path: '//'+splitPath.slice(0,f).join('/')
			}
			emit(dir,this.size)
		}
	}

	const reduceFolders = function(key, values) {
		return values.reduce((a,b) => a+b)
	}

	const aggregateFolders = function(collection) {
		db.get('files_temp').aggregate([
			{$group: {
				_id: {dirname: '$_id.dirname', size: '$value'},
				dirname: {$first: '$_id.dirname'},
				size: {$first: '$value'},
				paths: {$push: '$_id.path'}
			}},
			{$out: 'campusnetdirs'}
		], {allowDiskUse: true})
	}

	return indexDB.mapReduce(mapFolders, reduceFolders, {out:{replace:'files_temp'}}).then(aggregateFolders)
}

exports.buildKeywordIndex = function() {
	debug('building keyword index')
	// todo recode with more splits
	return indexDB.aggregate([
		{$project: {keywords: {$split: [{$toLower: '$filename'}, '.']}}},
		{$unwind: '$keywords'},
		{$sortByCount: '$keywords'},
		{$out: 'keywords'}
	], {allowDiskUse: true})
}