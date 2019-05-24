module.exports = (sequelize, DataTypes) => {
	const Keyword = sequelize.define(
		'keyword',
		{
			keyword: DataTypes.STRING,
		},{
		}
	)

	return Keyword
}