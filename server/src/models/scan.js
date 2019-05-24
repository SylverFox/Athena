module.exports = (sequelize, DataTypes) => {
	const Scan = sequelize.define(
		'scan',
		{
			task: DataTypes.STRING,
			starttime: DataTypes.DATE,
			runtime: DataTypes.INTEGER,
		},{
		}
	)

	return Scan
}