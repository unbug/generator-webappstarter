'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');

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
            this.template('module.html', 'html/site/include/'+this.lmoduleName+'.html');
            this.template('module.scss', 'scss/_debug-'+this.lmoduleName+'.scss');
            this.template('ModuleView.js', 'src/app/view/'+this.moduleName+'View.js');
            this.template('ModuleController.js', 'src/app/controller/'+this.moduleName+'Controller.js');
            this.template('TemplateModule.js', 'src/app/resources/Template'+this.moduleName+'.js');
        }
    }
});
