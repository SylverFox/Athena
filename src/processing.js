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

	const map = function() {
		emit({filename: this.filename, size: this.size}, this.path)
	}

	const reduce = function(key, values) {
		return {paths: values}
	}

	
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

	const map = function() {
		// split filename on dot, dash, underscore and whitespace characters
		// TODO filter on stuff
		this.filename.split(/[\.\s\-_]+/).forEach(word => {
			emit(word, 1)
		})
	}

	const reduce = function(key, values) {
		return values.length
	}
	
	return filesDB.mapReduce(map, reduce, {out: {replace: 'keywords'}})
}

function walkTree(tree, currentpath, cb) {
	let listing = []

	if(!tree || tree.length === 0) {
		cb(listing)
		return
	}

	tree.forEach((item, index) => {
		if(item.size === 0)
			return

		listing.push({
			filename: item.filename,
			size: item.size,
			directory: item.directory,
			path: currentpath
		})

		walkTree(item.children, currentpath+'/'+item.filename, (result) => {
			listing = listing.concat(result)

			if(index === tree.length - 1)
				cb(listing)
		})
	})
}

function insertIntoIndex(hostname, listing, cb) {
	listing.forEach((item, index) => {
		indexDBTemp.findOne({filename: item.filename, size: item.size}).then(doc => {
			if(doc) {
				doc.hostnames.push(hostname)
				indexDBTemp.update({filename: item.filename, size: item.size}, doc)
			} else {
				item.hostnames = [hostname]
				indexDBTemp.insert(item)
			}
			if(index === listing.length - 1)
				cb()
		})
	})
}