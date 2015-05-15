define(function (require, exports, module) {
  function Slider(config) {
    if (!config || !config.el) {
      return null;
    }
    var _this = this;
    var efn = function () {
      },
      el = config.el,
      pages = el.children,
      index = 0,
      lastIndex = 0,
      animTime = config.animTime || 600,
      transitions = el.getAttribute('transitions');

    var onFirst = config.onFirst || efn;
    var onLast = config.onLast || efn;
    var onPage = config.onPage || efn;

    function init() {
      if (!pages[0]) {
        return;
      }
      el.classList.remove(transitions);
      pages[0].classList.add('selected');
      fixHeight(pages[0]);
    }

    this.reset = function () {
      index = 0;
      doPage(pages[index]);
    }
    this.prePage = function () {
      index--;
      index = index < 0 ? 0 : index;
      if (index >= 0 && pages[index + 1]) {
        doPage(pages[index + 1]);
        index == 0 && onFirst();
      }
    }
    this.nextPage = function () {
      index++;
      index = index > pages.length - 1 ? pages.length - 1 : index;
      if (index <= pages.length - 1 && pages[index - 1]) {
        doPage(pages[index - 1]);
        index == (pages.length - 1) && onLast();
      }
    }
    function doPage(src, dest) {
      if (lastIndex == index) {
        return;
      }
      lastIndex = index;
      dest = dest || pages[index];

      el.classList.add(transitions);
      src.setAttribute('animate', '');
      dest.setAttribute('animate', '');
      src.offsetTop;
      src.classList.remove('selected');
      dest.classList.add('selected');

      fixHeight(dest);

      setTimeout(function () {
        el.classList.remove(transitions);
        for (var i = 0; i < pages.length; i++) {
          pages[i].removeAttribute('animate');
          (index != i) && pages[i].classList.remove('selected');
        }
      }, animTime + 100);
      onPage(index);
    }

    function fixHeight(dest) {
      if (config.fixHeight) {
        var h = dest.offsetHeight + 0;
        !!h && setTimeout(function () {
          el.style['min-height'] = h + 'px';
        }, 100);
      }
    }

    init();
  }

  return Slider;
});
