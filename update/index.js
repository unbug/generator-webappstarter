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
    reqirejs: function () {
      this.log('updating reqirejs files');
      this.copy('../../app/templates/app/src/almond.js', './src/almond.js');
      this.copy('../../app/templates/app/src/require.js', './src/require.js');
      this.copy('../../app/templates/app/src/require-config.js', './src/require-config.js');
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
      this.copy('../../app/templates/app/scss/_debug-common.scss','./scss/_debug-common.scss');
      this.copy('../../app/templates/app/scss/_debug-mixin.scss','./scss/_debug-mixin.scss');
      this.copy('../../app/templates/app/scss/_debug-value.scss','./scss/_debug-value.scss');
      this.copy('../../app/templates/app/scss/_debug-components.scss','./scss/_debug-components.scss');
      this.copy('../../app/templates/app/scss/_debug-slide.scss','./scss/_debug-slide.scss');
      this.copy('../../app/templates/app/scss/_debug-msgbox.scss','./scss/_debug-msgbox.scss');
      this.copy('../../app/templates/app/scss/_debug-tooltip.scss','./scss/_debug-tooltip.scss');
      this.copy('../../app/templates/app/scss/_debug-loading-spinner.scss','./scss/_debug-loading-spinner.scss');
      this.copy('../../app/templates/app/scss/_debug-section-download.scss','./scss/_debug-section-download.scss');
      this.copy('../../app/templates/app/scss/_debug-animate.scss','./scss/_debug-animate.scss');
      this.copy('../../app/templates/app/scss/_debug-button.scss','./scss/_debug-button.scss');
    },
    html: function(){
      this.log('updating some files in "./html/" directory');
      this.copy('../../app/templates/app/html/site/debug/index.html','./html/site/debug/index.html');
      this.copy('../../app/templates/app/html/site/official/index.html','./html/site/official/index.html');
      this.copy('../../app/templates/app/html/site/include/cache.manifest','./html/site/include/cache.manifest');
      this.copy('../../app/templates/app/html/site/include/msgbox.html','./html/site/include/msgbox.html');
      this.copy('../../app/templates/app/html/site/include/tooltip.html','./html/site/include/tooltip.html');
      this.copy('../../app/templates/app/html/site/include/components.html','./html/site/include/components.html');
      this.copy('../../app/templates/app/html/site/include/download.html','./html/site/include/download.html');
      this.copy('../../app/templates/app/html/site/include/scripts-version.html','./html/site/include/scripts-version.html');
      this.copy('../../app/templates/app/html/site/include/styles-version.html','./html/site/include/styles-version.html');
    },
    images: function(){
      this.log('updating "./resources/images" directory');
      this.directory('../../app/templates/app/resources/images', './resources/images');
    },
    other: function(){
      this.copy('../../app/templates/app/gulpfile.js', './gulpfile.js');
      this.copy('../../app/templates/app/README.md', './README.md');
    }
  }
});
