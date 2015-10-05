define(function (require, exports, module) {
  var Actions = require('../resources/Actions');
  var BasicModel = require('app/model/Model');
  var UserModel = require('app/model/UserModel');
  var BasicView = require('app/view/View');
  var UserView = require('app/view/UserView');

  function UserController() {
    this.models = {
      Basic: BasicModel,
      User: UserModel
    }
    this.views = {
      Basic: BasicView,
      User: UserView
    };

    var CTRL = this,
      viewNames,
      curViewId = '',
      viewUserQuery = {};

    viewNames = {
      'user': 'User'
    }
    Core.Router.subscribe('/user/', onViewUser, unViewUser);

    //统计视图
    Core.Event.on('analyticsCurView', analyticsCurView);
    //forwardUser
    Core.Event.on('forwardUser', forwardUser);


    function unViewUser() {
      CTRL.views.User.hide();
    }

    function onViewUser(req) {
      curViewId = 'user';
      viewUserQuery = req.query;
      CTRL.views.User.show();

      CTRL.views.Basic.msgbox.hideLoading();
      CTRL.models.User.user.request({id: viewUserQuery.userid},afterRequestUser);

      //追加统计
      analyticsCurView();
    }

    function afterRequestUser(success) {
      CTRL.views.Basic.msgbox.hideLoading();
      if (success) {
        CTRL.models.User.user.timer.update();
      } else {
        CTRL.views.Basic.msgbox.showFailed();
      }
    }

    function forwardUser(arg) {
      Core.Router.forward('/user/' + (arg || ''));
    }

    function analyticsCurView(params, title) {
      if (!Core.Router.currentMatch(['/user/'])) {
        return;
      }
      params = params ? ('&' + params) : '';
      title = title || viewNames[curViewId] || document.title;

      Core.Event.trigger('analytics', 'viewid=' + curViewId + params, title);
    }
  }

  return new UserController;
});
