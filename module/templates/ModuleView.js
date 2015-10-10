define(function (require, exports, module) {
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

    //model listeners

    function initEls() {
      if(els){return;}
      var main = VIEW._BasicView.getView(VIEW.viewCls);
      els = {
        main: main
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

    }//end render

  }//end View
  return new <%=moduleName%>View();
});
