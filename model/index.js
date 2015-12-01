'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var htmlWiring = require('html-wiring');

module.exports = yeoman.generators.Base.extend({
  constructor: function () {
    yeoman.generators.Base.apply(this, arguments);

    this.argument('model-name', {
      desc: 'Name of the model to generate',
      required: true
    });
  },

  init: function () {
    this.modelName = this['model-name'];
    this.umodelName = this.modelName.toUpperCase();
    this.args.splice(0, 1);
    this.components = this.args;
  },

  writing: {
    module: function () {
      //make ModelView js
      this.template('Model.js', 'src/app/model/' + this.modelName + 'Model.js');
    }
  }
});
