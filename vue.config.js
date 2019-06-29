const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  outputDir: 'client/dist/',
  devServer: {
    disableHostCheck: false
  },
  configureWebpack: {
    plugins: [
      new CopyWebpackPlugin([{
        from: path.join(__dirname, 'client/public'),
        to: path.join(__dirname, 'client/dist'),
        toType: 'dir',
        ignore: [ 'index.html' ]
      }])
    ]
  },
  chainWebpack: config => {
    config.plugin('html').tap(args => {
      args[0].template = path.join(__dirname,'client/public/index.html')
      return args
    })
  }
}