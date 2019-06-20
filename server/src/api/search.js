const search = require('express').Router()
const db = require('../models')
const Sequelize = require('sequelize')
const levenshtein = require('fast-levenshtein')

const MAX_RESULTS = 20

/**
 * Search the files database
 */
search.get('/', (req, res, next) => {
	if(!req.query.q) {
		next(Error('No search query given'))
	}

	const keywords = req.query.q.split(/[^\d\w]+/g)
		.map(escape)
		.filter(kw => kw.length)
		.map(kw => kw.toLowerCase())

	const query = db.File.findAll({
		where: {
			[Sequelize.Op.or]: keywords.map(kw => 
				({ filename: { [Sequelize.Op.substring]: kw } })	
			)
		}
	})

	query.then(result => res.json(result))
		.catch(err => next(err))
})

module.exports = search