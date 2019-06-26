const stats = require('express').Router()
const db = require('../models')

stats.get('/', (req, res, next) => {
  res.json({status: 'OK'})
})