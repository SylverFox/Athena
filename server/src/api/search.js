const search = require('express').Router()
const db = require('../models')
const Sequelize = require('sequelize')
const winston = require('winston')
// const levenshtein = require('fast-levenshtein')

const MAX_RESULTS = 100

/**
 * Search the files database
 */
search.get('/', (req, res, next) => {
  if(!req.query.q) {
    next(Error('No search query given'))
  }

  const keywords = req.query.q.split(/[^A-Za-z0-9]+/)
    .filter(kw => kw.length)
    .map(escape)
    .map(kw => kw.toLowerCase())

  const query = db.File.findAll({
    attributes: ['filename', 'path', 'size', 'isDirectory'],
    where: {
      [Sequelize.Op.or]: keywords.map(kw => 
        ({ filename: { [Sequelize.Op.substring]: kw } })	
      )
    },
    limit: MAX_RESULTS,
    include: [{
      model: db.Share,
      attributes: ['name'],
      include: [{
        model: db.Host,
        attributes: ['hostname']
      }]
    }]
  })

  query.then(result => {
    result = result.map((r, i) => {
      const path = '\\\\' + [r.Share.Host.hostname, r.Share.name, r.path, ''].join('\\')
        .replace(/\//g, '\\').replace(/\\\\/g, '\\')
      return {
        id: i,
        filename: r.filename,
        size: r.size,
        isDirectory: r.isDirectory,
        location: path,
        fullpath: path + r.filename
      }
    })
    res.json(result)
  }).catch(err => {
    winston.error(err.message, { stack: err.stack })
    next(Error('Error while searching'))
  })
})

module.exports = search