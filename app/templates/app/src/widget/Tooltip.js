var tpl = Core.microTmpl($('#tpl_tooltip').text());
var _body = $('body');

/**
 *
 * @param options {
   * single: if it's true,root container will remove from the renderTo element,default is true,
   * rootId: root container id,
   * rootCls: css class for the root container
   * renderTo: element for root container to render,
   * bodyCls: css class for the body container,
   * bodyStyle: css style for body container,
   * theme: UI theme,see in _tooltip.css
   * zIndex: z-index for root container,
   * top: top position,
   * left: left position,
   * bottom: bottom position,
   * autoShow: auto show,
   * showAnimCls: show animation class,
   * autoHide: auto hide,
   * hideDelay: delay time for aotuhide,default is 3500ms
   * hideAnimCls: hide animation class,
   * hideAnimDuration: duration time for hide animation,after that the element will be destoried,default is 15000ms;
   * onShow: event for show,
   * onHide: event for hide,
   * arrow: {
   *  type: left|right|top|bottom,
   *  position: top position for left|right,left position for top|bottom
   * }
   * }
 * @constructor
 */
function Tooltip(options) {
  options = options || {};
  var _this = this,
    emptyFn = function () {
    },
    onShow = options.onShow || emptyFn,
    onHide = options.onHide || emptyFn,
    prefix = 'tooltip',
    dZIndex = 90,
    single = options.single == undefined ? true : options.single,
    autoShow = options.autoShow == undefined ? true : options.autoShow,
    rootId = options.rootId || prefix + '_rootid_' + new Date().getTime(),
    renderTo = options.renderTo || _body,
    showAnimCls = options.showAnimCls || 'fadeIn',
    target = options.target!=undefined && (/string/i.test(typeof options.target)?$(options.target):options.target),
    els,
    destoryed = false;

  function init() {
    render();
    layout();
    autoShow && _this.show();
  }

  function render() {
    var arType = 'hide',
      arStl = '';
    if (options.arrow) {
      arType = options.arrow.type;
      if (/left|right/.test(arType)) {
        arStl = 'top:' + options.arrow.position + 'px';
      }
      else if (/top|bottom/.test(arType)) {
        arStl = 'left:' + options.arrow.position + 'px';
      }
    }
    renderTo.append(tpl({
      rootId: rootId,
      theme: options.theme || '',
      rootCls: options.rootCls || '',
      bodyCls: options.bodyCls || '',
      body: options.body || '',
      arrow: {
        type: arType,
        style: arStl
      }
    }));
    var main = $('#' + rootId);
    els = {
      main: main,
      ct: main.find('.tooltip__ct'),
      bd: main.find('.tooltip__bd'),
      content: main.find('.tooltip__content'),
      arrow: main.find('.tooltip__arrow')
    }
  }

  function layout() {
    els.main.css({
      'z-index': options.zIndex || dZIndex,
      'top': options.top != undefined ? (options.top + 'px') : 'auto',
      'bottom': options.bottom != undefined ? (options.bottom + 'px') : 'auto'
    });
    els.ct.css({
      'padding-left': options.left != undefined ? (options.left + 'px') : 'auto'
    });
    els.content.css(options.bodyStyle||{});
  }

  this.show = function () {
    els.bd.addClass(showAnimCls);
    els.main.addClass('show');
    onShow();

    options.autoHide && setTimeout(function () {
      _this.hide();
    }, options.hideDelay || 3500);
  }
  this.hide = function () {
    els.bd.removeClass(showAnimCls);
    options.hideAnimCls && els.bd.removeClass(options.hideAnimCls);
    setTimeout(function () {
      els.main.removeClass('show');
      onHide();
    }, options.hideAnimDuration || 0);

    single && setTimeout(function () {
      destory();
    }, options.hideAnimDuration ? (options.hideAnimDuration + 350) : 30000);
  }
  this.setArrowStyle = function (style) {
    els.arrow.css(style);
  }
  function destory() {
    if (destoryed) {
      return;
    }
    destoryed = true;
    els.main.remove();
  }

  init();
}

module.exports = Tooltip;
