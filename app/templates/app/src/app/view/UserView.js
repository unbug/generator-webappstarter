define(function (require, exports, module) {
  var BasicView = require('app/view/View');
  var BasicModel = require('app/model/Model');
  var UserModel = require('app/model/UserModel');

  function UserView() {
    this.models = {
      Basic: BasicModel,
      User: UserModel
    }
    this.viewCls = 'view-user';
    this._BasicView = BasicView;

    var VIEW = this,
      isApp = Core.NativeBridge.isApp(),
      Tpl, els,
      tap = VIEW._BasicView.tapEvent;

    //model listeners
    VIEW.models.User.user.updated(render);

    function initEls() {
      if(els){return;}
      var main = VIEW._BasicView.getView(VIEW.viewCls);;
      els = {
        main: main,

        list: main.find('.list'),
        back: main.find('.back')
      }
      bindEvent();
    }//end initEls
    function initTpls(){
      if(Tpl){return;}
      Tpl = Tpl || VIEW._BasicView.getTemplates(VIEW.viewCls);
    }
    function initResources() {
      initEls();
      initTpls();
    }
    this.getEls = function () {
      initEls();
      return els;
    }
    this.getTpls = function(){
      initTpls();
      return Tpl;
    }
    function bindEvent() {
      els.back.on(tap, Core.Router.back);
    }//end bindEvent

    this.show = function () {
      initResources();

      Core.Event.trigger('trigerAnimate',els.main);
      VIEW._BasicView.show(VIEW.viewCls);
    }
    this.hide = function () {
      if (!els) {
        return;
      }
    }
    function render(data) {
      initResources();

      data = data || VIEW.models.User.user.get();

      if (!data || !data.length) {
        return;
      }

      var list = [];
      data.forEach(function (key, index) {
        list.push(Tpl.listItem(key));
      });
      els.list.html(list.join(''));
      list = null;
    }//end render


  }//end View
  return new UserView();
});
