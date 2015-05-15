define(function (require, exports, module) {
  function WechatShare() {
    var meta = {
      "appid": "",
      "img_url": null,
      "img_width": "200",
      "img_height": "200",
      "link": window.location,
      "url": window.location,
      "desc": document.title,
      "content": document.title,
      "title": document.title
    }, dirtyTimer = 0, dirtyCount = 0;

    function setMeta(data) {
      meta = data || meta;
    }

    function command(name) {
      window.WeixinJSBridge.invoke(name, meta, function (res) {
      });
    }

    function weixinJSBridgeListener() {
      if (window.WeixinJSBridge && !window.WeixinJSBridge.__ListenerRegistered) {
        window.WeixinJSBridge.__ListenerRegistered = true;
        window.WeixinJSBridge.on('menu:share:appmessage', function (argv) {
          command('sendAppMessage');
        });
        window.WeixinJSBridge.on('menu:share:timeline', function (argv) {
          command('shareTimeline');
        });
        window.WeixinJSBridge.on('menu:share:weibo', function (argv) {
          command('shareWeibo');
        });
        return;
      }
      dirtyTimer && clearTimeout(dirtyTimer);
      if (dirtyCount < 60) {
        dirtyCount++;
        dirtyTimer = setTimeout(weixinJSBridgeListener, 1000);
      }
    }

    if (/MicroMessenger/i.test(window.navigator.userAgent)) {
      weixinJSBridgeListener();
      document.addEventListener('WeixinJSBridgeReady', weixinJSBridgeListener, false);
    }

    return setMeta;
  }

  return WechatShare();
});
