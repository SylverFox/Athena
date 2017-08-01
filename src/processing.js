const {debug} = require('winston')
const {ObjectID} = require('mongodb')
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
const streamDB = db.get('streamables')

const tempFilesDB = db.get('temp_files')
const tempFoldsDB = db.get('temp_dirs')

exports.initDB = function() {
	return new Promise((resolve, reject) => {
		// verify indexes
		scansDB.createIndex({task: 1})
		filesDB.createIndex({keywords: 1})
		foldsDB.createIndex({keywords: 1})
		keywdDB.createIndex({keywords: 1})
	})
}

exports.getStreamableInfo = function(key) {
	return streamDB.find({_id: key})
}

exports.getNodesInfo = function() {
	return nodesDB.find({}, {fields: {_id: 0, hostname: 1, lastseen: 1, shares: 1}})
}

exports.getNodeInfo = function(name) {
	return nodesDB.find({hostname: name}, {fields: {_id: 0, hostname: 1, lastseen: 1, shares: 1}})
}

exports.getNodeCount = function() {
	return nodesDB.count()
}

exports.updateNodeInfo = function(scanresult) {
	return nodesDB.update({hostname: scanresult.name, 'shares.name': scanresult.share},
		{$set: {'shares.$.files': scanresult.files, 'shares.$.size': scanresult.size}}
	)
}

exports.findFilesByKeywords = function(keywords) {
	return filesDB.find({keywords: {$all: keywords}}, {fields: {_id: 0}, limit: 1000})
}

exports.findDirectoriesByKeywords = function(keywords) {
	return foldsDB.find({keywords: {$all: keywords}}, {fields: {_id: 0}, limit: 1000})
}

exports.getLastScans = function() {
	return scansDB.aggregate([
		{$sort: {starttime: -1}},
		{$group: {
			_id: '$task',
			task: {$first: '$task'},
			starttime: {$first: '$starttime'},
			runtime: {$first: '$runtime'}
		}}
	])
}

exports.getLastScan = function(task) {
	return scansDB.find({task: task}, {sort: {starttime: -1}, limit: 1})
}

exports.insertNewScan = function(task, start, runtime, data) {
	return scansDB.insert({
		task: task,
		starttime: start,
		runtime: runtime,
		data: data
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
	debug('getting node sharelist')
	return new Promise((resolve, reject) => {
		//nodesDB.find({online: true}, '-_id ip hostname shares')
		nodesDB.find({online: true, hostname:'xis'}, {fields: {ip: 1, hostname: 1, shares:1}, limit:10, skip:0})
		.then(docs => resolve({nodes: docs, options: options}))
		.catch(reject)
	})
}

exports.emptyFilesCache = function() {
	debug('emptying file cache')
	return indexDB.drop()
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
			const keywords = splitPath[f].split(/[^\d\w]+/g)
				.filter(kw => kw.length).map(kw => kw.toLowerCase())
			const dir = {
				keywords: keywords,
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
		tempFoldsDB.aggregate([
			{$group: {
				_id: {dirname: '$_id.dirname', size: '$value', keywords: '$_id.keywords'},
				paths: {$push: '$_id.path'}
			}},
			{$project: {
				filename: '$_id.dirname',
				size: '$_id.size',
				paths: '$paths',
				keywords: '$_id.keywords'
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

exports.buildStreamableIndex = function() {
	// get: filename: '', size: 0, paths: [], keywords: []
	// to: share: '', file: '', size: 0, type: 'video/*'
	debug('indexing streamable content')

	const seasepregex = /^s?(\d+)[\.ex_](\d+)$/i

	let insertions = [streamDB.drop()]

	return this.findFilesByKeywords(['game','of','thrones','mp4'])
	.each((video, {close, pause, resume}) => {
		pause()
		const seasepkeyw = video.keywords.filter(kw => kw.match(seasepregex))
		if(!seasepkeyw.length) {
			return resume()
		}
		const match = seasepregex.exec(seasepkeyw)
		const season = parseInt(match[1])
		const episode = parseInt(match[2])
		const fullpath = video.paths[0] + '/' + video.filename
		const streamable = {
			series: 'Game of Thrones',
			season: season,
			episode: episode,
			location: fullpath,
			size: video.size,
			type: 'video/mp4'
		}

		insertions.push(streamDB.insert(streamable))

		resume()
	}).then(Promise.all(insertions))
}