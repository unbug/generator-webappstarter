// For instructions about this file refer to
// webpack and webpack-hot-middleware documentation
var webpack = require('webpack');
var path = require('path');
var conf = require('./package.json');
var loaders = [];
conf.project.babel && loaders.push({ test: /\.jsx?$/, exclude: /node_modules/,loader: "babel", query: {cacheDirectory: true } });

exports.dev = {
  debug: true,
  resolve: {
    root: [
      path.resolve('./src')
    ]
  },
  entry: './src/app/App.js',
  output: {
    filename: "app.js",
    sourceMapFilename: 'app.map'
  },
  module: {
    loaders: loaders
  },
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.NoErrorsPlugin()
  ],
  cache: true,
  devtool: 'source-map'
};

exports.build = {
  resolve: {
    root: [
      path.resolve('./src')
    ]
  },
  entry: './src/app/App.js',
  output: {
    filename: "app.js"
  },
  module: {
    loaders: loaders
  },
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.NoErrorsPlugin(),
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify("production")
      }
    })
  ]
};
