const {debug} = require('winston')
const config = require('config')
const NeDB = require('nedb-promises')

let db = {}
db.nodes = NeDB.create({filename: config.get('database.location')+'nodes.db', timestampData: true})
db.shares = NeDB.create({filename: config.get('database.location')+'shares.db'})
db.files = NeDB.create({filename: config.get('database.location')+'campusnetfiles.db'})
db.folds = NeDB.create({filename: config.get('database.location')+'campusnetdirs.db'})
db.scans = NeDB.create({filename: config.get('database.location')+'scans.db'})
db.keywd = NeDB.create({filename: config.get('database.location')+'keywords.db'})
db.index = NeDB.create({filename: config.get('database.location')+'files.db'})
db.stream = NeDB.create({filename: config.get('database.location')+'streamables.db'})
db.tempfiles = NeDB.create({filename: config.get('database.location')+'temp_files.db'})
db.tempFolds = NeDB.create({filename: config.get('database.location')+'temp_dirs.db'})

// TODO ensure indexes

exports.getStreamableInfo = (key) => db.stream.find({_id: key})

exports.getNodesInfo = function() {
	return db.nodes.find({}, {fields: {hostname: 1, lastseen: 1, shares: 1}})
}

exports.getNodeInfo = function(name) {
	return db.nodes.findOne({hostname: name}, {fields: {hostname: 1, lastseen: 1, shares: 1}})
}

exports.getNodeCount = function() {
	return db.nodes.count()
}

exports.updateShareInfo = function(scanresult) {
	return db.shares.update(
		{hostname: scanresult.name, sharename: scanresult.share},
		{$set: {files: scanresult.files, size: scanresult.size}},
		{$upsert: true}
	)
}

exports.findFilesByKeywords = function(keywords) {
	return db.files.find({keywords: {$all: keywords}}, {limit: 100})
}

exports.findDirectoriesByKeywords = function(keywords) {
	return db.folds.find({keywords: {$all: keywords}}, {limit: 100})
}

exports.getLastScans = function() {
	return db.scans.aggregate([
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
	return db.scans.findOne({task: task}, {sort: {starttime: -1}})
}

exports.insertNewScan = function(task, start, runtime, data) {
	return db.scans.insert({
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
			db.nodes.update(
				{ip: node.ip},
				{
					$set: node,
					$push: {seen: new Date()}
				},
				{upsert: true}
			)
		)
	})

	return Promise.all(promises)
}

exports.getNodeIPList = function({nodes, options}) {
	return new Promise((resolve, reject) => {
		db.nodes.find({}, {ip: 1}).then(docs => {
			resolve({nodes: docs, options: options})
		}).catch(reject)
	})
}

exports.updateOnlineStatus = function({nodes, options}) {
	let promises = []

	nodes.forEach((node, index) => {
		if(node.online) {
			promises.push(
				db.nodes.update({ip: node.ip},
					{$set: {online: true}, $push: {seen: new Date()}}
				)
			)
		} else {
			promises.push(
				db.nodes.update({ip: node.ip}, {$set: {online: false}})
			)
		}
		
	})

	return Promise.all(promises)
}

exports.getNodeShareList = function({nodes, options}) {
	debug('getting node sharelist')
	return new Promise((resolve, reject) => {
		db.nodes.find({online: true}, {ip: 1, hostname: 1, shares: 1})
		//db.nodes.find({online: true, hostname:'xis'}).projection({ip: 1, hostname: 1, shares:1}).limit(10).skip(0)
			.then(docs => resolve({nodes: docs, options: options}))
			.catch(reject)
	})
}

exports.emptyFilesCache = function() {
	debug('emptying file cache')
	return db.index.remove({}, {multi: true})
}

exports.insertNewFile = function({node, share, path, file}) {
	const fileToInsert = {
		filename: file.filename,
		size: file.size,
		path: '//' + node.hostname + '/' + share + '/' + path
	}

	return db.index.insert(fileToInsert)
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
		tempdb.files.aggregate([
			{$project: {
				filename: '$_id.filename',
				size: '$_id.size',
				paths: '$value.paths',
				keywords: '$_id.keywords'
			}},
			{$out: 'campusnetfiles'}
		], {allowDiskUse: true})
	}

	return db.index.mapReduce(mapFiles, reduceFiles, {out: {replace: 'temp_files'}}).then(aggregateFiles)
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
		tempdb.folds.aggregate([
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

	return db.index.mapReduce(mapFolders, reduceFolders, {out: {replace: 'temp_dirs'}}).then(aggregateFolders)
}

exports.buildKeywordIndex = function() {
	debug('building keyword index')
	// todo recode with more splits
	return db.index.aggregate([
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

	let insertions = [db.stream.drop()]

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

		insertions.push(db.stream.insert(streamable))

		resume()
	}).then(Promise.all(insertions))
}