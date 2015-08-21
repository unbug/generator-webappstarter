define(function (require, exports, module) {
  var Templates = require('app/resources/Templates');
  var BasicView = require('app/view/View');
  var BasicModel = require('app/model/Model');

  function <%=moduleName%>View(){
    this.models = {
      Basic: BasicModel
    }
    this.viewCls = 'view-<%=lmoduleName%>';
    this._BasicView = BasicView;

    var VIEW = this,
      isApp = Core.NativeBridge.isApp(),
      Tpl, els,
      tap = VIEW._BasicView.tapEvent;

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

      VIEW._BasicView.show(VIEW.viewCls);
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
  return new <%=moduleName%>View();
});
