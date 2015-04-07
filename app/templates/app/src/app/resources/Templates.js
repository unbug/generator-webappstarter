define(function(require, exports, module) {
    var Templates = {};
    
    Templates.Home = require('./TemplateHome');
    Templates.User = require('./TemplateUser');

    return Templates;
});