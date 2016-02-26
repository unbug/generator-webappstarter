var BasicView = require('app/view/View');
var BasicModel = require('app/model/Model');


function HomeView() {
  this.models = {
    Basic: BasicModel
  }
  this.viewCls = 'view-home';
  this._BasicView = BasicView;

  var VIEW = this,
    isApp = Core.NativeBridge.isApp(),
    Tpl, els,
    tap = VIEW._BasicView.tapEvent;

  //model listeners

  function initEls() {
    if(els){return;}
    els = VIEW._BasicView.getElements(VIEW.viewCls);
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

    if (!els.main.hasClass('show')) {
      Core.Event.trigger('trigerAnimate', els.main);
      VIEW._BasicView.show(VIEW.viewCls);
    }
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
module.exports = new HomeView();
