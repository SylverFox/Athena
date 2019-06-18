const stats = require('express').Router()
const db = require('../models')

stats.get('/', (req, res, next) => {
	db.Host.findAll({
		attributes: ['hostname']
	}).then(hosts => res.json({ success: true, data: hosts }))
})

module.exports = stats
