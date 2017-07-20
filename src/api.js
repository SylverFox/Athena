const {MongoClient} = require('mongodb')
const monk = require('monk')
const levenshtein = require('fast-levenshtein');
const {log} = require('winston')

const db = monk('localhost/athena')
db.then(() => log('info','API connected to MongoDB'))
	.catch(err => log('error', 'failed to connect to mongodb', err))
const nodesDB = db.get('nodes')
const cnet = db.get('campusnetindex')


exports.search = function(query, options) {
	const keywords = escape(query).split(' ')
	// http://www.regular-expressions.info/completelines.html
	const regexstring = '^(?=.*?\\b' + keywords.join('\\b)(?=.*?\\b') + '\\b).*$'
	const regex = new RegExp(regexstring, 'gi')

	return new Promise((resolve, reject) => {
		cnet.find({filename: regex}).then(docs => {
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