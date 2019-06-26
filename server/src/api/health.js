const health = require('express').Router()
const db = require('../models')

health.get('/', (req, res, next) => {
  res.json({status: 'OK'})
})

module.exports = health