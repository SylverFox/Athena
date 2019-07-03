module.exports = (sequelize, DataTypes) => {
  const HostHistory = sequelize.define('HostHistory', {
    files: {
      type: DataTypes.INTEGER,
      allowNull: false,
      default: 0
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      default: 0
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: false
  })

  HostHistory.associate = models => {
    HostHistory.belongsTo(models.Host)
  }

  return HostHistory
}