'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');

module.exports = yeoman.generators.Base.extend({
  constructor: function () {
    yeoman.generators.Base.apply(this, arguments);

    this.option('skip-install', {
      desc:     'Whether dependencies should be installed',
      defaults: false
    });
  },

  askFor: function () {
    var done = this.async();

    // Have Yeoman greet the user.
    this.log(yosay('I will give you a Simple Mobile Web App Boilerplate and Structure!'));

    var prompts = [{
      type    : 'input',
      name    : 'name',
      message : 'Give your project a name:(products|account|config|feed|vote|share|favorite|creation|feedback|dilog|invite|vote|event|share,are invalid names).',
      default : this.appname // Default to current folder name
    }];

    this.prompt(prompts, function (answers) {
      this.projectName = answers.name;

      // Save user configuration options to .yo-rc.json file
      this.config.set({
        projectName: this.projectName
      });
      this.config.save();

      done();
    }.bind(this));
  },

  writing: {
    app: function () {
      this.template('_package.json','package.json');

      this.directory('app','./');
    },

    projectfiles: function () {
      this.fs.copy(
        this.templatePath('ftppass'),
        this.destinationPath('.ftppass')
      );
      this.fs.copy(
        this.templatePath('gitignore'),
        this.destinationPath('.gitignore')
      );
      this.fs.copy(
        this.templatePath('editorconfig'),
        this.destinationPath('.editorconfig')
      );
      this.fs.copy(
        this.templatePath('jshintrc'),
        this.destinationPath('.jshintrc')
      );
    }
  },

  install: function () {
    this.installDependencies({
      skipInstall: this.options['skip-install']
    });
  }
});
