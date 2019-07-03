const winston = require('winston')

const db = require('../models')

/**
 * Does post processing on indexed hosts, such as building keyword indexes
 */
module.exports = async function postProcessing() {
  winston.debug('starting postprocessing')
  const starttime = new Date()

  // build keyword index
  await db.Keyword.truncate()
  const files = await db.File.findAll()
  
  let keywords = {}
  for(let file of files) {
    const kws = file.filename.split(/[-+_. ]+/)
    for(let kw of kws) {
      if(!kw.length) {
        continue
      }

      if(keywords[kw]) {
        keywords[kw]++
      } else {
        keywords[kw] = 1
      }
    }
  }

  keywords = Object.keys(keywords).map(kw => ({
    keyword: kw,
    count: keywords[kw]
  }))

  await db.Keyword.bulkCreate(keywords)
  await db.Scan.create({
    task: 'postprocessing',
    starttime: starttime,
    runtime: Date.now() - starttime
  })
  winston.debug('finished postprocessing')
}