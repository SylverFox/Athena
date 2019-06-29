module.exports = (sequelize, DataTypes) => {
  const Share = sequelize.define('Share', {
    name: {
      type: DataTypes.STRING,
      required: true
    },
    filecount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    size: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  },{
    timestamps: true
  })

  Share.associate = models => {
    Share.belongsTo(models.Host, { hooks: true, onDelete: 'CASCADE' })
  }

  return Share
}