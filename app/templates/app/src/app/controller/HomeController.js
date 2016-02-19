var Actions = require('../resources/Actions');
var BasicModel = require('app/model/Model');
var BasicView = require('app/view/View');
var HomeView = require('app/view/HomeView');

function HomeController() {
  this.models = {
    Basic: BasicModel
  }
  this.views = {
    Basic: BasicView,
    Home: HomeView
  };

  var CTRL = this,
    viewNames,
    curViewId = '',
    viewHomeQuery = {};

  viewNames = {
    'home': 'Home'
  }
  Core.Router
    .onUnsubscribed(onViewUnnamed,unViewUnnamed)
    .subscribe('/home/', onViewHome, unViewHome);

  //统计视图
  Core.Event.on('analyticsCurView', analyticsCurView);
  //forwardHome
  Core.Event.on('forwardHome', forwardHome);

  function unViewUnnamed() {
    unViewHome();
  }

  function unViewHome() {
    CTRL.views.Home.hide();
  }

  function onViewUnnamed(req) {
    onViewHome(req);
    Core.Event.trigger('analytics');
  }

  function onViewHome(req) {
    curViewId = 'home';
    viewHomeQuery = req.query;
    CTRL.views.Home.show();

    //追加统计
    analyticsCurView();
  }

  function forwardHome(arg) {
    Core.Router.forward('/home/' + (arg || ''));
  }

  function analyticsCurView(params, title) {
    if (!Core.Router.currentMatch(['/home/', Core.Router.getUnsubscribedAction()])) {
      return;
    }
    params = params ? ('&' + params) : '';
    title = title || viewNames[curViewId] || document.title;

    Core.Event.trigger('analytics', 'viewid=' + curViewId + params, title);
  }
}

module.exports = new HomeController;
