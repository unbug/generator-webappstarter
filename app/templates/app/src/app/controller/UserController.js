define(function (require, exports, module) {
  var Actions = require('../resources/Actions');
  var BaseModel = require('app/model/Model');
  var BaseView = require('app/view/View');
  var UserView = require('app/view/UserView');

  function UserController() {
    this.models = {
      Base: BaseModel
    }
    this.views = {
      Base: BaseView,
      User: UserView
    };

    var CTRL = this,
      viewNames,
      curViewId = '',
      viewUserQuery = {};

    viewNames = {
      'user': 'User'
    }
    Core.Router.onChanged(onViewChanged)
      .subscribe('/user/', onViewUser);

    //统计视图
    Core.Event.on('analyticsCurView', analyticsCurView);
    //forwardUser
    Core.Event.on('forwardUser', forwardUser);


    function onViewChanged() {
      if (!Core.Router.currentMatch('/user/')) {
        CTRL.views.User.hide();
      }
    }

    function onViewUser(param,req) {
      curViewId = 'user';
      viewUserQuery = req.query;
      CTRL.views.User.show();

      CTRL.views.Base.msgbox.hideLoading();
      CTRL.models.Base.user.request({id: viewUserQuery.userid},afterRequestUser);

      //追加统计
      analyticsCurView();
    }

    function afterRequestUser(success) {
      CTRL.views.Base.msgbox.hideLoading();
      if (success) {
        CTRL.models.Base.updateModelTimeout('user');
      } else {
        CTRL.views.Base.msgbox.showFailed();
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
