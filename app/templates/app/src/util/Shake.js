define(function (require, exports, module) {
  /**
   * 摇一摇工具，如果 android 客户端则使用客户端的摇一摇接口
   *
   */

  var _fn = function () {
    },
    x1 = 0, y1 = 0, z1 = 0, x2 = 0, y2 = 0, z2 = 0,
    startstamp = 0,
    threshold = 15,
    duration = 1000,
    timeout = 5000,
    delayTimer = 0;

  var _onStart = _fn;
  var _onEnd = _fn;

  function onStart() {
    _onStart();
    _onStart = _fn;
  }

  function onEnd() {
    delayTimer && clearTimeout(delayTimer);
    _onEnd();
    _onEnd = _fn;
  }

  var checkDeviceMotion = function () {
    var deltaX = Math.abs(x2 - x1),
      deltaY = Math.abs(y2 - y1),
      deltaZ = Math.abs(z2 - z1);

    if ((deltaX > threshold && deltaY > threshold) || (deltaX > threshold && deltaZ > threshold) || (deltaY > threshold && deltaZ > threshold)) {
      var curtime = (new Date()).getTime(),
        d = curtime - startstamp;
      if (d > duration) {
        window.removeEventListener('devicemotion', _listener);
        onEnd();
        startstamp = curtime;
      }
    }

    x2 = x1;
    y2 = y1;
    z2 = z1;
  }

  function _listener(e) {
    x1 = e.accelerationIncludingGravity.x;
    y1 = e.accelerationIncludingGravity.y;
    z1 = e.accelerationIncludingGravity.z;
    checkDeviceMotion();
  }

  /**
   * 监听摇一摇事件
   *
   * @method shakeListener
   * @param {Function} startCallback 当事件开始时触发的方法
   * @param {Function} endCallback 当事件结束时触发的方法
   * @param {Function} abortCallback 等待超时触发的方法
   * @param {Function} errorCallback 不支持摇一摇时触发的方法
   */
  function Shake(startCallback, endCallback, abortCallback, errorCallback) {
    _onStart = startCallback || _onStart;
    _onEnd = endCallback || _onEnd;
    delayTimer && clearTimeout(delayTimer);

    function originShakeListener() {
      window.removeEventListener('devicemotion', _listener);

      x1 = 0;
      y1 = 0;
      z1 = 0;
      x2 = 0;
      y2 = 0;
      z2 = 0;
      startstamp = (new Date()).getTime();
      onStart();
      window.addEventListener('devicemotion', _listener, false);

      delayTimer = setTimeout(function () {
        window.removeEventListener('devicemotion', _listener);
        _onEnd = _fn;
        abortCallback && abortCallback();
      }, timeout);
    }

    function nativeShakeListener() {
      if (window.extra && window.extra.__newsapp_shake_start) {
        window.__newsapp_shake = onEnd;
        onStart();
        window.extra.__newsapp_shake_start();

        delayTimer = setTimeout(function () {
          window.extra.__newsapp_shake_stop && window.extra.__newsapp_shake_stop();
          _onEnd = _fn;
          abortCallback && abortCallback();
        }, timeout);
      }
    }

    var _shakeFn;
    //使用新闻客户端的方法
    if (window.extra && window.extra.__newsapp_shake_start) {
      _shakeFn = nativeShakeListener;
    }
    //使用浏览器事件
    else if (window.DeviceMotionEvent || ('ondevicemotion' in window)) {
      _shakeFn = originShakeListener;
    }
    else {
      _shakeFn = errorCallback;
    }
    _shakeFn && _shakeFn();
  }

  return Shake;
});
