define(function (require, exports, module) {
  var Template<%=moduleName%> = function () {
    if (Template<%=moduleName%>.prototype.instance){
      return Template<%=moduleName%>.prototype.instance;
    }
    var el = $('.view-<%=lmoduleName%>');

    function getTpl(selector) {
      return Core.microTmpl(el.find(selector).text());
    }

    Template<%=moduleName%>.prototype.instance = this;
  }
  return Template<%=moduleName%>;
});
