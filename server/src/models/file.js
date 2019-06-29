module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define('File',
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
    File.belongsTo(models.Share, { hooks: true, onDelete: 'CASCADE' })
  }

  return File
}