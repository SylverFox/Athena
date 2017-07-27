const monk = require('monk')
const levenshtein = require('fast-levenshtein');
const {debug} = require('winston')

const config = require('../config')
const processing = require('./processing')

const {username,password,host,port,name} = config.database
const creds = username && password ? `${username}:${password}@` : ''
const db = monk(`mongodb://${creds}${host}:${port}/${name}`, {})
const nodesDB = db.get('nodes')
const filesDB = db.get('campusnetfiles')
const foldsDB = db.get('campusnetdirs')


exports.search = function(query, options) {
	const keywords = query.split(/[^\d\w]+/g).map(escape).filter(kw => kw.length).map(kw => kw.toLowerCase())
	options = options || {}
	const start = options.start || 0
	const max = options.max || 20

	return new Promise((resolve, reject) => {
		

		let queries = [
			processing.findFilesByKeywords(keywords),
			processing.findDirectoriesByKeywords(keywords)
		]

		Promise.all(queries).then(results => {
			results = results.reduce((a,b) => a.concat(b)).sort((doc1, doc2) => {
				levDoc1 = levenshtein.get(doc1.filename,query)
				levDoc2 = levenshtein.get(doc2.filename,query)
				return levDoc1 - levDoc2;
			}).slice(start, max)

			resolve(JSON.stringify(results))
		}).catch(reject)
	})
}

exports.getStatistics = function() {
	return new Promise((resolve, reject) => {
		const promises = [
			this.athenaStats(),
			this.serverStats()
		]

		Promise.all(promises).then(res => {
			resolve(JSON.stringify({
				athenastats: JSON.parse(res[0]),
				allserverstats: JSON.parse(res[1])
			}))
		}).catch(reject)
	})
}

exports.athenaStats = function() {
	return new Promise((resolve, reject) => {
		processing.getLastScan('indexKnownHosts')
		.then(doc => resolve(JSON.stringify(doc[0])))
		.catch(reject)
	})
}

exports.serverStats = function(options) {
	options = options || {}
	options.hostname = options.hostname || ''

	return new Promise((resolve, reject) => {
		const promise = options.hostname ? processing.getNodeInfo(options.hostname) : processing.getNodesInfo()

		promise.then(docs => resolve(JSON.stringify(docs))).catch(reject)
	})
}

// TODO: a bunch of stuff