define(function (require, exports, module) {
  var TemplateResult = function () {
    if (TemplateResult.prototype.instance) {
      return TemplateResult.prototype.instance;
    }
    var el = $('.view-user');

    function getTpl(selector) {
      return Core.microTmpl(el.find(selector).text());
    }

    this.list = {
      item: getTpl('.list script')
    }
    TemplateResult.prototype.instance = this;
  }
  return TemplateResult;
});
