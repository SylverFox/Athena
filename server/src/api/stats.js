const stats = require('express').Router()
const db = require('../models')

/**
 * Retrieve basic server statistics
 */
stats.get('/', (req, res, next) =>
  db.Scan.findOne({
    attributes: ['task', 'starttime', 'runtime'],
    where: { task: 'indexKnownHosts' },
    order: [ [ 'createdAt', 'DESC' ]]
  }).then(result => res.json(result))
    .catch(err => next(err))
)

/**
 * Retrieve hosts statistics
 */
stats.get('/hosts', (req, res, next) => {
  db.Host.findAll({
    attributes: ['id', 'hostname', 'lastseen'],
    include: [{
      model: db.Share,
      attributes: ['name', 'filecount', 'size']
    }]
  }).then(result => res.json(result))
    .catch(err => next(err))
})

/**
 * Retrieve single host statistics
 */
stats.get('/host/:id', (req, res, next) => {
  db.Host.findOne({
    where: { id: req.params.id },
    attributes: ['id'],
    include: [{
      model: db.HostHistory,
      attributes: ['files', 'size', 'date']
    }]
  }).then(result => res.json(result))
    .catch(err => next(err))
})

module.exports = stats
