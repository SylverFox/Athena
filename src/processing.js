const {log} = require('winston')
const {MongoClient} = require('mongodb')
const monk = require('monk')

const db = monk('localhost/athena')

const nodesDB = db.get('nodes')
const indexDB = db.get('campusnetindex')
const indexDBTemp = db.get('campusnetindex_temp')
const scansDB = db.get('scans')
const keywdDB = db.get('keywords')
const keywdDBTemp = db.get('keywords_temp')

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

exports.buildFileIndex = function() {
	return new Promise((resolve, reject) => {
		log('debug', 'building file index')

		nodesDB.find().each((node, {close, pause, resume}) => {
			pause()
			log('debug','current node: '+node.hostname)
			walkTree(node.tree, '//'+node.hostname, listing => {
				insertIntoIndex(node.hostname, listing, () => {
					resume()
				})
			})
		}).then(collection => {
			return indexDB.remove({})
		}).then(() => {
			return indexDBTemp.find({})	
		}).then(docs => {
			return indexDB.insert(docs)
		}).then(() => {
			return indexDBTemp.remove({})
		}).then(() => {
			log('debug', 'buildfileindex succeeded')
			resolve();
		}).catch(err => {
			log('warn', 'buildfileindex error.',err)
			reject()
		})
	})
}

exports.buildKeywordIndex = function() {
	const map = function() {
		// split filename on dot, dash, underscore and whitespace characters
		this.filename.split(/[\.\s\-_]+/).forEach(word => {
			emit(word, 1)
		})
	}

	const reduce = function(key, values) {
		return values.length
	}

	return new Promise((resolve, reject) => {
		log('debug', 'building keyword index')

		indexDB.mapReduce(map, reduce, {out: {replace: 'keywords'}}).then(collection => {
			log('debug', 'collection: ', collection)
			//return keywdDB.remove({})
		}).then(() => {
			//return keywdDBTemp.find({})	
		}).then(docs => {
			log('debug', 'docs found: ', docs)
			//return keywdDB.insert(docs)
		}).then(() => {
			//return keywdDBTemp.remove({})
		}).then(() => {
			log('debug', 'buildkeywordindex succeeded')
			resolve();
		}).catch(err => {
			log('warn', 'buildkeywordindex error.',err)
			reject()
		})
	})
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