'use strict'

const Sequelize = require('sequelize')
const fs = require('fs')
const path = require('path')
const basename = path.basename(__filename)
const config = require('config')
let db = {}

const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: path.join(config.database.location, 'athena.sqlite'),
	logging: false
})

fs
	.readdirSync(__dirname)
	.filter(file => (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js'))
	.forEach(file => {
		var model = sequelize['import'](path.join(__dirname, file))
		db[model.name] = model
	})

Object.keys(db).forEach(modelName => {
	if (db[modelName].associate) {
		db[modelName].associate(db)
	}
})

sequelize.sync()

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db