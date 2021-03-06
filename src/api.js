const {MongoClient} = require('mongodb')
const monk = require('monk')
const levenshtein = require('fast-levenshtein');
const {debug} = require('winston')

const db = monk('localhost/athena')
const nodesDB = db.get('nodes')
const cnet = db.get('campusnetindex')


exports.search = function(query, options) {
	const keywords = query.split(' ').map(escape)
	// http://www.regular-expressions.info/completelines.html
	const regexstring = '^(?=.*?' + keywords.join(')(?=.*?') + ').*$'
	const regex = new RegExp(regexstring, 'gi')

	return new Promise((resolve, reject) => {
		cnet.find({filename: regex}, {limit: 1000}).then(docs => {
			debug('results from db: '+docs.length)
			var topResults = docs.sort((doc1, doc2) => {
				levDoc1 = levenshtein.get(doc1.filename,query)
				levDoc2 = levenshtein.get(doc2.filename,query)
				return levDoc1 - levDoc2;
			}).slice(0,20)
			resolve(topResults)
		}).catch(reject)
	})
}

// TODO: a bunch of stuff