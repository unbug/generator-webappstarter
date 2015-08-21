define(function (require, exports, module) {
  var Templates = require('app/resources/Templates');
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
      Tpl, els, viewParam,
      tap = VIEW._BasicView.tapEvent;

    //注册model观察者

    function initEls() {
      if (els) {
        return;
      }
      var main = $('.view-home');
      els = {
        //body: $('body'),
        main: main

      }
      bindEvent();
    }//end initEls
    function initResources() {
      Tpl = new Templates.Home;
      viewParam = '';
      initEls();
    }

    this.getEls = function () {
      return els;
    }
    function bindEvent() {

    }//end bindEvent

    this.show = function () {
      initResources();

      if (!els.main.hasClass('show')) {
        VIEW._BasicView.show(VIEW.viewCls);

        Core.Event.trigger('trigerAnimate', els.main);
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
  return new HomeView();
});
