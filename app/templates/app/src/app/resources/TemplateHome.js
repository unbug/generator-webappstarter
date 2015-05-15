define(function (require, exports, module) {
  var TemplateHome = function () {
    if (TemplateHome.prototype.instance) {
      return TemplateHome.prototype.instance;
    }
    var el = $('.view-home');

    function getTpl(selector) {
      return Core.microTmpl(el.find(selector).text());
    }

    TemplateHome.prototype.instance = this;
  }
  return TemplateHome;
});
