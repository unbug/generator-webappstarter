define(function (require, exports, module) {
  var Templates = {};

  Templates.Home = require('./TemplateHome');
  Templates.User = require('./TemplateUser');
  //__INSERT_POINT__ Don't delete!!

  return Templates;
});
