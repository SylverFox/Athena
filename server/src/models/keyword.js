module.exports = (sequelize, DataTypes) => {
	const Keyword = sequelize.define('Keyword', {
		keyword: DataTypes.STRING,
	},{
		
	})

	return Keyword
}