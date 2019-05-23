const {debug} = require('winston')
const config = require('config')
const NeDB = require('nedb-promises')

let db = {}
// load collections
db.hosts = NeDB.create({filename: config.get('database.location')+'hosts.db', autoload: true})
db.shares = NeDB.create({filename: config.get('database.location')+'shares.db', autoload: true})
db.files = NeDB.create({filename: config.get('database.location')+'files.db', autoload: true})
db.scans = NeDB.create({filename: config.get('database.location')+'scans.db', autoload: true})
db.keywords = NeDB.create({filename: config.get('database.location')+'keywords.db', autoload: true})

// ensure indexes on collections
db.hosts.ensureIndex({fieldName: 'ip', unique: true})
db.hosts.ensureIndex({fieldName: 'hostname', unique: true})
db.shares.ensureIndex({fieldName: 'hostId'})
db.shares.ensureIndex({fieldName: 'sharename'})
// db.files.ensureIndex({fieldName: 'shareId'})
// db.files.ensureIndex({fieldName: 'filename'})

/* DB FUNCTIONS */

exports.compactDB = function() {
	return Promise.all([
		db.hosts.persistence.compactDatafile(),
		db.shares.persistence.compactDatafile(),
		db.files.persistence.compactDatafile(),
		db.scans.persistence.compactDatafile(),
		db.keywords.persistence.compactDatafile(),
	])
}

/* HOSTS FUNCTIONS */

/**
 * Returns the host with the specified Id
 * @param {string} hostId
 */
exports.findHostById = hostId => db.hosts.findOne({_id: hostId})

/**
 * Return the host with the specified hostname
 * @param {string} hostname
 */
exports.findHostByName = hostname => db.hosts.findOne({hostname})

/**
 * Returns all known hosts
 */
exports.findHosts = () => db.hosts.find({})

/**
 * Returns all online hosts. Hosts are considered online when they were last seen in the past 
 * 10 minutes
 */
exports.findOnlineHosts = () => db.hosts.find({lastseen: {$gt: new Date(Date.now() - 10 * 60000)}})

/**
 * Returns the number of hosts in the database
 */
exports.findHostCount = () => db.hosts.count()

/**
 * Updates the last time seen of the host with the specified id with the current date
 * @param {string} _id
 */
exports.updateLastseen = _id => db.hosts.update({_id}, {$set: {lastseen: new Date()}})

/**
 * Upserts a host with its info and the current time
 * @param {object} host
 */
exports.upsertHost = host => db.hosts.update(
	{ip: host.ip},
	{$set: {hostname: host.hostname, ip: host.ip, lastseen: host.online ? new Date() : 0}},
	{upsert: true}
)

/**
 * Upserts multiple hosts
 * @param {object[]} hosts
 */
exports.upsertHosts = hosts => Promise.all(hosts.map(exports.upsertHost))

/* SHARES FUNCTIONS */

/**
 * Finds a share by the specified ID
 * @param {string} shareId
 */
exports.findShareById = shareId => db.shares.findOne({_id: shareId})

/**
 * Finds a share by the specified name
 * @param {string} sharename
 */
exports.findShareByName = sharename => db.shares.findOne({sharename})

/**
 * Upserts a share with the given share object
 * @param {object} share
 */
exports.upsertShare = (hostId, share) => db.shares.update(
	{hostId: hostId, sharename: share.name},
	{$set: {hostId: hostId, sharename: share.name, filecount: share.filecount, size: share.size}},
	{upsert: true}
)

/* FILES FUNCTIONS */

/**
 * Inserts a file object with the give shareId into the db
 * @param {string} shareId
 * @param {object} file
 */
exports.insertFile = (shareId, file) => db.files.insert(Object.assign({shareId}, file))

/**
 * Inserts files in bulk and tags it with the shareId
 * @param {string} shareId
 * @param {object[]} files
 */
exports.insertFiles = (shareId, files) => db.files.insert(
	files.map(f => {
		f.shareId = shareId
		return f
	})
)

/**
 * Removes all the files from the db with the given shareId
 * @param {string} shareId
 */
exports.removeFiles = shareId => db.files.remove({shareId}, {multi: true})

/**
 * Replaces all files from the share with the given Id
 */
exports.replaceFilesOfShare = (shareId, files) => {
	return db.files.remove({shareId}, {multi: true}).then(
		() => db.files.insert(files.map(f => {
			f.shareId = shareId
			return f
		}))
	)
}


/* SCANS FUNCTIONS */

/**
 * Retrieves the last scan result by its task name
 * @param {string} task
 */
exports.findLastScanByTask = task => db.scans.findOne({task: task}, {sort: {starttime: -1}})

/**
 * Inserts a new scanresult
 * @param {string} scan
 * @param {date} starttime
 * @param {number} runtime
 * @param {*} data
 */
exports.insertScan = (task, starttime, runtime, data) =>
	db.scans.insert({task, starttime, runtime, data})


/* KEYWORDS FUNCTIONS */


/* PRIVATE FUNCTIONS */

/**
 * Splits a filename into specific parts so they can be used by search
 * @param {string} filename 
 */
function extractKeywords(filename) {
	// TODO
	debug('extract keywords not implemented')
	return []
}





/* OLD STUFF FROM HERE !!! */

// TODO improve for partial match
exports.findFilesByKeywords = keywords => db.files.find({$and: keywords.map(kw => {keywords: kw})}, {limit: 100})



// TODO NeDB does not support aggregate
exports.getLastScans = () => {
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

exports.insertScan = (task, starttime, runtime, data) => db.scans.insert({task, starttime, runtime, data})







// TODO deprecated
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

// TODO deprecated
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


// TODO deprecated
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

