var fs = require('fs');
var path = require('path');
var merge = require('webpack-merge');
var config = require('./config');
// var loader = require('./loader');
var plugin = require('./plugin');
var utils = require('../utils');

var baseWebpackConfig = require('./webpack.base.config');
var userWebpackPath = utils.resolve('webpack.dev.config.js');

var entry = {};
var htmls = [];
var manifests = [];
var dlljs = [];
var pages = utils.getPages(utils.resolve('src'));
var sharePath = path.join(__dirname, '../.share');

// dll
if (config.fle.vendors && typeof config.fle.vendors === 'object') {
  Object.keys(config.fle.vendors).forEach(k => {
    var filePath = utils.resolve(`.cache/devDll/${k}.manifest.json`);
    if (fs.existsSync(filePath)) {
      manifests.push(plugin.dllReference({
        manifest: filePath
      }));
      dlljs.push('/' + k + '.js');
    } else {
      console.log(`The vendors of [${k}] has no dll manifest, Please run "fle dll --dev" firstly!`);
    }
  });
}

htmls.push(plugin.html({
  title: '页面导航',
  filename: 'index.html',
  template: path.join(sharePath, 'template/dev-index.html'),
  favicon: path.join(sharePath, 'images/favicon.ico'),
  pages: pages
}));

pages.forEach(page => {
  entry[page.id] = page.entry;

  if (page.template) {
    if (page.template[0] === '/') {
      page.template = path.join(sharePath, 'template', page.template.substr(1));
    } else {
      page.template = utils.resolve(page.template);
    }
  }

  page.filename = 'html/' + page.id + '.html';
  page.chunks = [page.id];

  page.css = [].concat(config.fle.css, page.css).filter(c => c);
  page.prejs = [].concat(config.fle.prejs, page.prejs).filter(c => c);
  page.js = [].concat(config.fle.js, page.js, dlljs).filter(c => c);

  htmls.push(plugin.html(page));
});

//基本配置
var webpackConfig = {
  entry: entry,
  devtool: 'cheap-module-eval-source-map',
  output: {
    publicPath: '/',
    filename: 'js/[name].js',
    chunkFilename: 'js/[name].chunk.js'
  },
  plugins: [
    config.fle.hot && plugin.hmr(),
    config.vconsole && plugin.vconsole(),
    plugin.namedModules(),
    plugin.noErrors(),
    plugin.friendlyErrors()
  ].filter(r => r).concat(manifests, htmls),
  externals: config.fle.externals,
  devServer: {
    host: config.fle.host,
    port: config.fle.port,
    contentBase: resolve('.cache/devDll'),
    proxy: config.fle.proxy,
    compress: true,
    hot: config.fle.hot,
    historyApiFallback: true,
    open: config.fle.open,
    https: config.fle.https,
    quiet: true,
    // noInfo: true,
    // stats: 'errors-only',
    clientLogLevel: 'warning',
    disableHostCheck: true,
    overlay: true,
    watchOptions: {
      poll: true
    }
  }
};

module.exports = merge(
  baseWebpackConfig,
  webpackConfig,
  fs.existsSync(userWebpackPath) ? require(userWebpackPath) : {}
);
