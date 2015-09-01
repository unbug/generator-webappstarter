define(function (require, exports, module) {
  var RequestHelper = require('app/model/RequestHelper');
  var Actions = require('app/resources/Actions');

  var Mdl = Core.Class.Model,
    lcStorage = Core.localStorage;

  function Model() {
    var MODEL = this,
      userId, udid, appUserMeta,
      loginCookieTimerPrefix = 'loginCookieTimer_';

    this.getCookie = function (sKey) {
      return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
    }
    this.setCookie = function (name, value, days) {
      if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        var expires = "; expires=" + date.toGMTString();
      }
      else var expires = "";
      document.cookie = name + "=" + value + expires + "; path=/";
    }
    //校验登录 cookies
    this.verifyLoginCookie = function () {
      var uid = this.getCookie('uid'),
        sig = this.getCookie('sig');

      this.setUserId(uid);

      return uid && sig;
    }
    this.saveLoginCookieTimeout = function () {
      var key = loginCookieTimerPrefix + this.getUserId();
      lcStorage.set(key, new Date().getTime());
    }
    //校验 cookies 有效期，这里用 1 天
    this.verifyLoginCookieTimeout = function (minutes) {
      var key = loginCookieTimerPrefix + this.getUserId(),
        last = lcStorage.get(key) || 0;
      minutes = minutes || 1 * 60 * 24 * 1;
      return ( (new Date().getTime()) - last ) < minutes * 60 * 1000;
    }
    this.setUdId = function (id) {
      udid = id;
    }
    this.getUdId = function () {
      return udid;
    }
    this.setUserId = function (id) {
      userId = id || userId;
    }
    this.getUserId = function () {
      return userId || (appUserMeta && appUserMeta.userid) || this.getCookie('uid');
    }
    this.getAppUserMeta = function () {
      return appUserMeta;
    }
    this.setAppUserMeta = function (data) {
      appUserMeta = data;
    }
    this.isLogined = function () {
      return !!this.getUserId();
    }

    //数据缓存更新
    this.modelUpdate = new Mdl();

  }
  return new Model;
});
