module.exports = (sequelize, DataTypes) => {
  const Host = sequelize.define('Host', {
    ip: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    hostname: {
      type: DataTypes.STRING,
      allowNull: false,
      set(val) {
        this.setDataValue('hostname', val.toLowerCase())
      }
    },
    lastseen: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },{
    timestamps: true
  })

  Host.associate = models => {
    Host.hasMany(models.Share)
  }
  return Host
}