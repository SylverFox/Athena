module.exports = (sequelize, DataTypes) => {
	const Share = sequelize.define(
		'share',
		{
			sharename: DataTypes.STRING,
		},{
			timestamps: true
		}
	)

	Share.associate = models => {
		Share.belongsTo(models.host)
		Share.hasMany(models.file)
	}

	return Share
}