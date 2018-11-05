const levenshtein = require('fast-levenshtein')

const processing = require('./processing')

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
				const levDoc1 = levenshtein.get(doc1.filename,query)
				const levDoc2 = levenshtein.get(doc2.filename,query)
				return levDoc1 - levDoc2
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
			resolve({athenastats: res[0], allserverstats: res[1]})
		}).catch(reject)
	})
}

exports.athenaStats = function() {
	return processing.getLastScan('indexKnownHosts')
}

exports.serverStats = function(options) {
	options = options || {}
	options.hostname = options.hostname || ''

	return new Promise((resolve, reject) => {
		const promise = options.hostname ? processing.getNode(options.hostname) : processing.getNodes()

		promise.then(resolve).catch(reject)
	})
}

// TODO: a bunch of stuff