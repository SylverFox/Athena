module.exports = (sequelize, DataTypes) => {
	const File = sequelize.define(
		'file',
		{
			filename: DataTypes.STRING,
			path: DataTypes.STRING,
			size: DataTypes.INTEGER,
			isDirectory: DataTypes.BOOLEAN
		},{
			timestamps: true
		}
	)

	File.associate = models => {
		File.belongsTo(models.share)
	}

	return File
}