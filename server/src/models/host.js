module.exports = (sequelize, DataTypes) => {
	const Host = sequelize.define(
		'host',
		{
			ip: DataTypes.STRING,
			hostname: DataTypes.STRING,
			lastseen: {
				type: DataTypes.DATE,
				defaultValue: DataTypes.NOW
			}
		},{
			timestamps: true
		}
	)

	Host.associate = models => {
		Host.hasMany(models.share)
	}

	return Host
}