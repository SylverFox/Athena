const health = require('express').Router()
const db = require('../models')

health.get('/', (req, res, next) => {
  if(!db) {
    res.status(503).json({ status: 'FAIL', message: 'DB is down' })
  } else {
    res.json({ status: 'OK' })
  }
  next()
})

module.exports = health