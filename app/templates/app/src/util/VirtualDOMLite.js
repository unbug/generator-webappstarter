define(function (require, exports, module) {
  require('lib/diffDOM');

  //https://github.com/fiduswriter/diffDOM
  //https://gist.github.com/zulfajuniadi/bd95fe5e047cb9aa01c7
  ;(function ($) {
    $.fn.superHtml = $.fn.html;
    function applyDiff(){
      this._VDiff = this._VDD.diff(this[0], this._VDOM);
      if(this._VDiff.length > 0) {
        this._VDD.apply(this[0], this._VDiff);
        this.eq(0).trigger('virtualdomrendered');
      }
      return this;
    }
    $.fn.html = function (html,diff) {
      if(diff && this._VDOM){
        this._VDOM = this[0].cloneNode();
        this._VDD = this._VDD || new diffDOM();
        this._VDOM.innerHTML = html;
        return applyDiff.call(this);
      }else{
        this._VDOM = 1;
        var res = this.superHtml.apply(this,arguments);
        this.eq(0).trigger('virtualdomrendered');
        return res;
      }
    }

  })(window.Zepto);
});
