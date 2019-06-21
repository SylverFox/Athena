const search = require('express').Router()
const db = require('../models')
const Sequelize = require('sequelize')
const levenshtein = require('fast-levenshtein')

const MAX_RESULTS = 100

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
    result = result.map((r, i) => ({
      id: i,
      filename: r.filename,
      size: r.size,
      isDirectory: r.isDirectory,
      path: r.path,
      fullpath: ['\\\\', r.Share.Host.hostname, r.Share.name, r.path, r.filename]
        .join('\\').replace(/\\\\/g, '\\')
    }))

    res.json(result)
  }).catch(err => next(err))
})

module.exports = search