//require('util/AppCache');
require('lib/zepto');
require('lib/Core');
require('app/resources/i18n');

var BasicController = require('app/controller/Controller');
var HomeController = require('app/controller/HomeController');
var UserController = require('app/controller/UserController');
//__INSERT_POINT__ Don't delete!!

function App() {
  var params = Core.localParam(),
    standalone = params.search['standalone'];//如果带此参数，初始页非首页的浏览器历史返回将不会回首页
  setTimeout(function () {
    //Core.Router.init(standalone?'':'/home/');
    Core.Router.init();
  }, 50);
}

window.App = new App;
