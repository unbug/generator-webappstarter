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
            this.template('module.html', 'html/site/include/'+this.lmoduleName+'.html');
            var file = htmlWiring.readFileAsString('html/site/include/views.html'),
                add = [];
            add.push('\n<!-- '+this.lmoduleName+' -->');
            add.push( '\n@@include("include/'+this.lmoduleName+'.html")' );
            add.push('\n<!-- end '+this.lmoduleName+' -->');
            file += add.join('');
            htmlWiring.writeFileFromString(file, 'html/site/include/views.html');

            //make module scss and add to _debut-view.scss
            this.template('module.scss', 'scss/_debug-'+this.lmoduleName+'.scss');
            file = htmlWiring.readFileAsString('scss/_debug-view.scss');
            add = [];
            add.push('\n\n/*debug-'+this.lmoduleName+'.scss*/');
            add.push( '\n@import "debug-'+this.lmoduleName+'.scss";' );
            add.push('\n/*end debug-'+this.lmoduleName+'.scss*/');
            file += add.join('');
            htmlWiring.writeFileFromString(file, 'scss/_debug-view.scss');

            //make module view js
            this.template('ModuleView.js', 'src/app/view/'+this.moduleName+'View.js');
            //make module controller js
            this.template('ModuleController.js', 'src/app/controller/'+this.moduleName+'Controller.js');
            //make module template js
            this.template('TemplateModule.js', 'src/app/resources/Template'+this.moduleName+'.js');
        }
    }
});
