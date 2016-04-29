'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var htmlWiring = require('html-wiring');

module.exports = yeoman.generators.Base.extend({
  constructor: function () {
    yeoman.generators.Base.apply(this, arguments);
  },

  init: function () {
  },

  writing: {
    core: function () {
      this.log('updating "./src/core" directory');
      this.directory('../../app/templates/app/src/core', './src/core');
    },
    lib: function () {
      this.log('updating "./src/lib" directory');
      this.directory('../../app/templates/app/src/lib', './src/lib');
    },
    util: function () {
      this.log('updating "./src/util" directory');
      this.directory('../../app/templates/app/src/util', './src/util');
    },
    widget: function () {
      this.log('updating "./src/widget" directory');
      this.directory('../../app/templates/app/src/widget', './src/widget');
    },
    app: function(){
      this.log('updating some files in "./src/app/" directory');
      //copy Basic Controller.js
      this.copy('../../app/templates/app/src/app/controller/Controller.js', './src/app/controller/Controller.js');
      //copy Basic View.js
      this.copy('../../app/templates/app/src/app/view/View.js', './src/app/view/View.js');
      //copy Basic Model.js
      this.copy('../../app/templates/app/src/app/model/Model.js', './src/app/model/Model.js');
      this.copy('../../app/templates/app/src/app/model/RequestHelper.js', './src/app/model/RequestHelper.js');
    },
    scss: function(){
      this.log('updating some files in "./scss/" directory');
      this.copy('../../app/templates/app/scss/_common.scss','./scss/_common.scss');
      this.copy('../../app/templates/app/scss/_mixin.scss','./scss/_mixin.scss');
      this.copy('../../app/templates/app/scss/_value.scss','./scss/_value.scss');
      this.copy('../../app/templates/app/scss/_box.scss','./scss/_box.scss');
      this.copy('../../app/templates/app/scss/_util.scss','./scss/_util.scss');
      this.copy('../../app/templates/app/scss/_components.scss','./scss/_components.scss');
      this.copy('../../app/templates/app/scss/_slide.scss','./scss/_slide.scss');
      this.copy('../../app/templates/app/scss/_msgbox.scss','./scss/_msgbox.scss');
      this.copy('../../app/templates/app/scss/_msgbox-android.scss','./scss/_msgbox-android.scss');
      this.copy('../../app/templates/app/scss/_msgbox-deja.scss','./scss/_msgbox-deja.scss');
      this.copy('../../app/templates/app/scss/_tooltip.scss','./scss/_tooltip.scss');
      this.copy('../../app/templates/app/scss/_loading-spinner.scss','./scss/_loading-spinner.scss');
      this.copy('../../app/templates/app/scss/_section-download.scss','./scss/_section-download.scss');
      this.copy('../../app/templates/app/scss/_animate.scss','./scss/_animate.scss');
      this.copy('../../app/templates/app/scss/_button.scss','./scss/_button.scss');
    },
    html: function(){
      this.log('updating some files in "./html/" directory');
      this.copy('../../app/templates/app/html/debug/index.html','./html/debug/index.html');
      this.copy('../../app/templates/app/html/official/index.html','./html/official/index.html');
      this.copy('../../app/templates/app/html/include/cache.manifest','./html/include/cache.manifest');
      this.copy('../../app/templates/app/html/include/msgbox.html','./html/include/msgbox.html');
      this.copy('../../app/templates/app/html/include/tooltip.html','./html/include/tooltip.html');
      this.copy('../../app/templates/app/html/include/components.html','./html/include/components.html');
      this.copy('../../app/templates/app/html/include/download.html','./html/include/download.html');
      this.copy('../../app/templates/app/html/include/scripts-version.html','./html/include/scripts-version.html');
      this.copy('../../app/templates/app/html/include/styles-version.html','./html/include/styles-version.html');
    },
    images: function(){
      this.log('updating "./resources/images" directory');
      this.directory('../../app/templates/app/resources/images', './resources/images');
    },
    other: function(){
      this.copy('../../app/templates/app/gulpfile.js', './gulpfile.js');
      this.copy('../../app/templates/app/.babelrc', './.babelrc');
      this.copy('../../app/templates/app/webpack.config.js', './webpack.config.js');
      this.copy('../../app/templates/app/README.md', './README.md');
    }
  }
});
