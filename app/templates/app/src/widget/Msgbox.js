define(function (require, exports, module) {
  function Msgbox(option) {
    //MONOSTATE
    if (Msgbox.prototype.instance) {
      return Msgbox.prototype.instance;
    }
    option = option || {};
    var GlobalTouch = option.GlobalTouch;
    var _this = this,
      bEl,
      readyToHide = true,
      isLoading,
      VIEW = option.view,
      emptyFn = function () {
      };
    bEl = {
      box: $('.msgbox'),
      bd: $('.msgbox .msgbox-bd'),
      dialog: $('.box-ct.dialog'),
      loading: $('.box-ct.loading'),
      signin: $('.box-ct.signin')

    }
    bEl.dialog.hide();
    bEl.loading.hide();
    bEl.signin.hide();

    //dialog
    bEl.dialog.nbt = bEl.dialog.find('.no');
    bEl.dialog.ybt = bEl.dialog.find('.yes');
    bEl.dialog.title = bEl.dialog.find('.title');
    bEl.dialog.msg = bEl.dialog.find('.msg');
    bEl.dialog.nbt.on('click', function () {
      _this.hideDialog(bEl.dialog.noCallback);
    });
    bEl.dialog.ybt.on('click', function () {
      _this.hideDialog(bEl.dialog.yesCallback);
    });
    /**
     * option = {
         *     title,
         *     msg,
         *     yesText,
         *     noText,
         *     yesCallback,
         *     noCallback
         * }
     */
    this.showDialog = function (option) {
      option = option || {};
      readyToHide = false;
      bEl.dialog.yesCallback = option.yesCallback;
      bEl.dialog.noCallback = option.noCallback;
      bEl.dialog.ybt[option.yesText ? 'show' : 'hide']().html(option.yesText);
      bEl.dialog.nbt[option.noText ? 'show' : 'hide']().html(option.noText);
      bEl.dialog.title[option.title ? 'show' : 'hide']().html(option.title || '');
      bEl.dialog.msg[option.msg ? 'show' : 'hide']().html(option.msg || '');
      setTimeout(function () {
        bEl.dialog.show();
        _this.show();
      }, 400);
    }
    this.hideDialog = function (callback) {
      readyToHide = true;
      bEl.dialog.hide();
      _this.hide();
      callbackHandler(callback);
    }
    /**
     * option = {
         *     title,
         *     msg,
         *     yesText,
         *     yesCallback
         * }
     */
    this.showFailed = function (option) {
      option = option || {};
      var _option = {
        title: option.title || 'Sorry~',
        msg: option.msg || 'Unable to connect to the Internet',
        yesText: option.yesText || 'OK',
        yesCallback: option.yesCallback
      }
      _this.showDialog(_option);
    }
    /**
     * option = {
         *     msg,
         *     hideCallback
         * }
     */
    this.showError = function (option) {
      option = option || {};
      var _option = {
        msg: option.msg || ''
      }
      _this.showDialog(_option);
      setTimeout(function () {
        _this.hideDialog(option.hideCallback);
      }, 2500);
    }
    /**
     * option = {
         *     yesCallback
         * }
     */
    this.showDownload = function (option) {
      option = option || {};
      var _option = {
        msg: '请安装或启动客户端最新版!',
        noText: '取消',
        yesText: '前往',
        yesCallback: option.yesCallback
      }
      _this.showDialog(_option);
    }
    //signin
    bEl.signin.nbt = bEl.signin.find('.no');
    bEl.signin.ybt = bEl.signin.find('.plf');
    bEl.signin.msg = bEl.signin.find('.msg');
    bEl.signin.nbt.on('click', function () {
      _this.hideSignin(bEl.signin.noCallback);
    });
    bEl.signin.ybt.on('click', '.b', function () {
      _this.hideSignin(bEl.signin.yesCallback, this.getAttribute('data-plf'));
    });
    /**
     * option = {
         *     msg,
         *     yesCallback,
         *     noCallback
         * }
     */
    this.showSignin = function (option) {
      option = option || {};
      readyToHide = false;

      bEl.signin.noCallback = option.noCallback;
      bEl.signin.yesCallback = option.yesCallback;

      bEl.signin.msg.html(option.msg || 'Please sign in');


      bEl.signin.show();
      this.show();
    }
    this.hideSignin = function (callback, data) {
      readyToHide = true;
      bEl.signin.hide();
      _this.hide();
      callbackHandler(callback, data);
    }
    this.show = function (el) {
      el = el || bEl.box;
      setTimeout(function () {
        bEl.box.css({height: document.body.scrollHeight + 'px'});
      }, 500);
      if (el == bEl.box) {
        el.addClass('show');
      } else {
        el.css({'display': '-webkit-box'});
      }
    }
    this.hide = function (el) {
      el = el || bEl.box;
      isLoading = false;
      if (readyToHide) {
        if (el == bEl.box) {
          el.removeClass('show');
        } else {
          el.css({'display': 'none'});
        }
      }
    }
    this.showLoading = function (msg) {
      bEl.loading.msg = bEl.loading.msg || bEl.loading.find('.msg');
      bEl.loading.msg.html(msg || 'Loading...');
      if (!isLoading) {
        isLoading = true;
        bEl.loading.show();
        this.show();
        //globalPreventTouchmove = true;
      }
    }
    this.hideLoading = function () {
      if (isLoading) {
        isLoading = false;
        bEl.loading.hide();
        _this.hide();
        //globalPreventTouchmove = false;
      }
    }
    this.showDonateComplete = function () {
      readyToHide = false;

      bEl.donateComplete.show();
      this.show();
      setTimeout(_this.hideDonateComplete, 2500);
    }
    this.hideDonateComplete = function () {
      readyToHide = true;
      bEl.donateComplete.hide();
      _this.hide();
    }
    function callbackHandler(callback, data) {
      if (callback) {
        callback(data);
        callback = null;
      }
    }

    //MONOSTATE
    Msgbox.prototype.instance = this;
  }//end Msgbox
  return Msgbox;
});
