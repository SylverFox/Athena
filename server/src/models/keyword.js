module.exports = (sequelize, DataTypes) => {
  const Keyword = sequelize.define('Keyword', {
    keyword: DataTypes.STRING,
    count: {
      type: DataTypes.INTEGER,
      default: 0
    }
  },{
		
  })

  return Keyword
}