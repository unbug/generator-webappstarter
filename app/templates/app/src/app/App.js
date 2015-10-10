define(function (require, exports, module) {
  require('lib/zepto');
  require('lib/Core');

  var BasicController = require('./Controller/Controller');
  var HomeController = require('./Controller/HomeController');
  var UserController = require('./Controller/UserController');
  //__INSERT_POINT__ Don't delete!!

  function App() {
    var params = Core.localParam(),
      standalone = params.search['standalone'];//如果带此参数，初始页非首页的浏览器历史返回将不会回首页
    setTimeout(function () {
      //Core.Router.init(standalone?'':'/home/');
      Core.Router.init();
    }, 250);
  }

  window.App = new App;
});
