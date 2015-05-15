define(function (require, exports, module) {
  var Templates = require('app/resources/Templates');
  var BaseView = require('app/view/View');
  var BaseModel = require('app/model/Model');


  function <%=moduleName%>View(owner){
    this.models = {
      Base: BaseModel
    }
    this.viewCls = 'view-<%=lmoduleName%>';
    this._owner = owner;

    var VIEW = this,
      isApp = Core.NativeBridge.isApp(),
      Tpl, els,
      tap = VIEW._owner.tapEvent;

    //注册model观察者

    function initEls() {
      if (els) {
        return;
      }
      var main = $('.view-<%=lmoduleName%>');
      els = {
        //body: $('body'),
        main: main,

        list: main.find('.list'),
        back: main.find('.back')
      }
      bindEvent();
    }//end initEls
    function initResources() {
      Tpl = new Templates.<%=moduleName%>;
      initEls();
    }

    this.getEls = function () {
      return els;
    }
    function bindEvent() {
      els.back.on(tap, Core.Router.back);
    }//end bindEvent

    this.show = function () {
      initResources();

      VIEW._owner.show(VIEW.viewCls);
    }
    this.hide = function () {
      if (!els) {
        return;
      }
    }
    function render(data) {
      initResources();

    }//end render

  }//end View
  return new <%=moduleName%>View(BaseView);
});
