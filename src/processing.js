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

const tempFilesDB = db.get('temp_files')
const tempFoldsDB = db.get('temp_dirs')

exports.verifyExistingCollections = function() {
	// verify existing collections
	db.create('nodes')
	db.create('campusnetfiles')
	db.create('campusnetdirs')
	db.create('scans')
	db.create('keywords')
	db.create('files')

	// verify indexes
	filesDB.createIndex({keywords: 1})
	foldsDB.createIndex({keywords: 1})
	keywdDB.createIndex({keywords: 1})



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

	const mapFiles = function() {
		// split files by keyword
		const keywords = this.filename.split(/[^\d\w]+/g)
			.filter(kw => kw.length).map(kw => kw.toLowerCase())
		emit({keywords: keywords, filename: this.filename, size: this.size}, {paths: [this.path]})
	}

	const reduceFiles = function(key, values) {
		return {paths: values.map(v => v.paths[0])}
	}

	const aggregateFiles = function(collection) {
		tempFilesDB.aggregate([
			{$project: {
				filename: '$_id.filename',
				size: '$_id.size',
				paths: '$value.paths',
				keywords: '$_id.keywords'
			}},
			{$out: 'campusnetfiles'}
		], {allowDiskUse: true})
	}

	return indexDB.mapReduce(mapFiles, reduceFiles, {out: {replace: 'temp_files'}}).then(aggregateFiles)
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

	return indexDB.mapReduce(mapFolders, reduceFolders, {out: {replace: 'temp_dirs'}}).then(aggregateFolders)
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