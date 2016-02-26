'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var htmlWiring = require('html-wiring');

module.exports = yeoman.generators.Base.extend({
  constructor: function () {
    yeoman.generators.Base.apply(this, arguments);

    this.argument('module-name', {
      desc: 'Name of the module to generate',
      required: true
    });
  },

  init: function () {
    this.moduleName = this['module-name'];
    this.lmoduleName = this.moduleName.toLowerCase();
    this.args.splice(0, 1);
    this.components = this.args;
  },

  writing: {
    module: function () {
      //make module html,and add to view.html
      this.template('module.html', 'html/site/include/view-' + this.lmoduleName + '.html');
      var file = htmlWiring.readFileAsString('html/site/include/views.html'),
        add = [];
      add.push('\n<!-- view-' + this.lmoduleName + ' -->');
      add.push('\n@@include("include/view-' + this.lmoduleName + '.html")');
      add.push('\n<!-- end view-' + this.lmoduleName + ' -->');
      file += add.join('');
      htmlWiring.writeFileFromString(file, 'html/site/include/views.html');

      //make module scss and add to _view.scss
      this.template('module.scss', 'scss/_view-' + this.lmoduleName + '.scss');
      file = htmlWiring.readFileAsString('scss/_view.scss');
      add = [];
      add.push('\n\n/*view-' + this.lmoduleName + '.scss*/');
      add.push('\n@import "view-' + this.lmoduleName + '.scss";');
      add.push('\n/*end view-' + this.lmoduleName + '.scss*/');
      file += add.join('');
      htmlWiring.writeFileFromString(file, 'scss/_view.scss');

      //make module view js
      this.template('ModuleView.js', 'src/app/view/' + this.moduleName + 'View.js');

      //make module controller js App.js
      this.template('ModuleController.js', 'src/app/controller/' + this.moduleName + 'Controller.js');
      file = htmlWiring.readFileAsString('src/app/App.js');
      file = file.replace('//__INSERT_POINT__',["var "+this.moduleName+"Controller = require('app/controller/"+this.moduleName+"Controller');",'\n  //__INSERT_POINT__'].join(''));
      htmlWiring.writeFileFromString(file, 'src/app/App.js');
    }
  }
});
