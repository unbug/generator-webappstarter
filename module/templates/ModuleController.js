define(function (require, exports, module) {
  var Actions = require('../resources/Actions');
  var BasicModel = require('app/model/Model');
  var BasicView = require('app/view/View');
  var <%=moduleName%>View = require('app/view/<%=moduleName%>View');

  function <%=moduleName%>Controller(){
    this.models = {
      Basic: BasicModel
    }
    this.views = {
      Basic: BasicView,
      <%=moduleName%>: <%=moduleName%>View
    }

    var CTRL = this,
      viewNames,
      curViewId = '',
      view<%=moduleName%>Query = {};

    viewNames = {
      '<%=lmoduleName%>': '<%=moduleName%>'
    }
    Core.Router.subscribe('/<%=lmoduleName%>/', onView<%=moduleName%>, unView<%=moduleName%>);

    //统计视图
    Core.Event.on('analyticsCurView', analyticsCurView);
    //forward<%=moduleName%>
    Core.Event.on('forward<%=moduleName%>', forward<%=moduleName%>);


    function unView<%=moduleName%>() {
      CTRL.views.<%=moduleName%>.hide();
    }

    function onView<%=moduleName%>(req){
      curViewId = '<%=lmoduleName%>';
      view<%=moduleName%>Query = req.query;
      CTRL.views.<%=moduleName%>.show();

      //追加统计
      analyticsCurView();
    }
    function forward<%=moduleName%>(arg){
      Core.Router.forward('/<%=lmoduleName%>/' + (arg || ''));
    }

    function analyticsCurView(params, title) {
      if (!Core.Router.currentMatch(['/<%=lmoduleName%>/'])) {
        return;
      }
      params = params ? ('&' + params) : '';
      title = title || viewNames[curViewId] || document.title;

      Core.Event.trigger('analytics', 'viewid=' + curViewId + params, title);
    }
  }
  return new <%=moduleName%>Controller;
});
