var Navigator = require('core/Navigator');

var nav = navigator,
  isiOS = (/iphone|ipod/gi).test(nav.platform)||(/ipad/gi).test(nav.platform),
  isAndroid = (/Android/gi).test(nav.userAgent),
  isWeixin = (/MicroMessenger/ig).test(nav.userAgent),
  config = {
    default: '',
    wx: '',
    iOS: '',
    schema: ''
  };

function redirectToPage(link) {
  if (link) {
    window.location = decodeURIComponent(link);
  }
}

function download() {
  redirectToPage(config.default);
}

function wxOpen() {
  redirectToPage(config.wx);
}

function iOSOpen() {
  //先跳转后下载
  //参看 http://www.iunbug.com/archives/2012/09/18/401.html
  config.schema && redirectToPage(config.schema);
  setTimeout(function () {
    redirectToPage(config.iOS);
  }, 50);
}

function androidOpen() {
  //打开同时下载
  config.schema && Navigator.protocol(decodeURIComponent(config.schema), true);
  download();
}

/*
 * iOS点击打开:
 1.如果是微信就去引导图页面
 2.如果不是微信就走安装就打开不安装就去app store
 3.如果微信用户按引导图从浏览器打开就能走通第2条

 android点击打开:
 1.如果是微信就在打开的时候同时跳转到有图的引导页
 2.如果不是微信就同时跳转到公公共下载页
 3.如果微信用户按引导图从浏览器打开就能走通第2条
 */
/**
 * conf = {
 *   default, //link for default redirect to
 *   wx, //link to open in WeChat
 *   iOS,// open AppStore
 *   schema,// URL schema for open your app
 * }
 */
function openAppInBrowser(conf) {
  config = conf || config;

  if (isWeixin) {
    wxOpen();
  } else if (isiOS && !isAndroid) {
    iOSOpen();
  } else {
    androidOpen();
  }
}


module.exports = openAppInBrowser;
