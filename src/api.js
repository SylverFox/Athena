const {MongoClient} = require('mongodb')
const monk = require('monk')
const levenshtein = require('fast-levenshtein');
const {debug} = require('winston')
const config = require('../config')

const {username,password,host,port,name} = config.database
const creds = username && password ? `${username}:${password}@` : ''
const db = monk(`mongodb://${creds}${host}:${port}/${name}`, {})
const nodesDB = db.get('nodes')
const filesDB = db.get('campusnetfiles')
const foldsDB = db.get('campusnetdirs')


exports.search = function(query, options) {
	const keywords = query.split(' ').map(escape)

	return new Promise((resolve, reject) => {
		filesDB.find({keywords: {$all: keywords}}, {fields: {_id: 0}, limit: 100}).then(docs => {
			debug('results from db: '+docs.length)
			console.log(docs)
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