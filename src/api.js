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
	const keywords = query.split(/[^\d\w]+/g).map(escape).filter(kw => kw.length).map(kw => kw.toLowerCase())

	return new Promise((resolve, reject) => {
		let results = []

		filesDB.find({keywords: {$all: keywords}}, {fields: {_id: 0}, limit: 100})
		.then(docs => {
			results = docs
			debug(docs.length)
			return foldsDB.find({keywords: {$all: keywords}}, {fields: {_id: 0}, limit: 100})
		}).then(docs => {
			results = results.concat(docs)
			debug(docs.length)
			debug(results)
			results.sort((doc1, doc2) => {
				levDoc1 = levenshtein.get(doc1.filename,query)
				levDoc2 = levenshtein.get(doc2.filename,query)
				return levDoc1 - levDoc2;
			}).slice(0,20)
			resolve(results)
			debug(results)
			results = null
		}).catch(reject)
	})
}

// TODO: a bunch of stuff