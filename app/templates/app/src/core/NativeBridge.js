define(function (require, exports, module) {
  var Navigator = require('./Navigator');

  /**
   * 与客户端交互
   *
   *    前端与客户端交互的流程主要为前端调用，客户端读取，客户端回调三个步骤：
   *    前端调用客户端规则为：dejafashion://NAME（android 前端调用window.__dejafashion_NAME()）
   *    客户端读取前端的数据规则为 window.__dejafashion_data_NAME，前端返回JSON {default:'',...}
   *    【如果有】客户端处理完逻辑回调前端的方法规则为： window.__dejafashion_after_NAME([json])
   *    拿分享为例:
   *    1 -------> 前端调用dejafashion://share（android 前端调用window.__dejafashion_share()）
   *    2 --------> 客户端接收到请求，向前端读取必要参数window.__dejafashion_data_share
   *    3 ------- >【如果有】 客户端处理完逻辑回调通知前端处理完毕调用window.__dejafashion_after_share([json])
   *    4 ------>前端接收客户端传回来的参数该干嘛干嘛
   *    注意，客户端在调用前端方法之前一定要先做判断，如 window.__dejafashion_after_share && window.__dejafashion_after_share([json])
   *
   */
  function NativeBridge(protocolHandler) {
    var _NB = this,
      global = window,
      emptyFn = function () {
      },
      appUA = (/Deja/ig).test(navigator.userAgent),
      debug = false,
      afterCallbacks = {},
      Protocols = {},
      baseName = 'dejafashion',
      baseProtocol = baseName + '://',
      baseObjName = '__' + baseName,
      baseDataName = baseObjName + '_data_',
      baseBeforeName = baseObjName + '_before_',
      baseAfterName = baseObjName + '_after_',
      baseUpdateDataName = 'set_data_for_',
      baseUpdateBeforeName = 'set_before_for_';

    afterCallbacks = {};
    Protocols = {};


    function enableDebug() {
      debug = true;
    }

    function isApp() {
      return appUA || debug;
    }

    function protocol(action, callback) {
      protocolHandler(action, true);
      //开启调试
      if (debug && callback) {
        var _data = action.match(/[\w]:\/\/(.*)/);
        if(typeof callback=='function'){callback(_data && _data[1]);}
      }
    }

    function afterCallback(rs, callback) {
      callback = callback || emptyFn;
      if(typeof callback=='function'){callback(rs);}
      callback = emptyFn;
    }

    function updateData(name, data) {
      if (data != null && data != undefined) {
        if ( !/object/i.test(typeof data) ) {
          data = {default: data};
        }

        global[baseDataName + name] = data;
      }
    }
    function updateBefore(name, fn) {
      if(/function/i.test(typeof fn) ){
        global[baseBeforeName + name] = fn;
      }else{
        delete global[baseBeforeName + name];
      }
    }

    /**
     * set_data_for_NAME = function(data)
     * @param name
     * @param fn
     */
    function registerUpdateDataFn(name, fn) {
      var updateName = baseUpdateDataName + name;
      _NB[updateName] = fn || function (data) {
          updateData(name, data);
        }
    }

    /**
     * set_before_for_NAME = function(callback)
     * @param name
     */
    function registerBeforeFn(name) {
      var beforeName = baseUpdateBeforeName + name;
      _NB[beforeName] = function (fn) {
        updateBefore(name, fn);
      }
    }

    /**
     * register a native API
     *
     * @param name
     * @param fn
     * @returns {*}
     */
    function registerFn(name, fn) {
      Protocols[name] = baseProtocol + name;
      afterCallbacks[name] = emptyFn;
      global[baseAfterName + name] = function (rs) {
        afterCallback(rs, afterCallbacks[name]);
      }
      registerUpdateDataFn(name);
      _NB[name] = fn
        || function (data, callback, subProtocol) {
          updateData(name, data);
          afterCallbacks[name] = callback;
          if (isApp()) {
            if (global[baseObjName] && global[baseObjName][name]) {
              global[baseObjName][name]();
            } else {
              protocol(Protocols[name] + (subProtocol ? ('/' + subProtocol) : ''), callback);
            }
          }
        };

      return _NB[name];
    }

    /**
     *
     * execute a native API  by it's name
     * if it's not exist then register it and execute it
     *
     * @param name
     */
    function trigger(name){
      var fn = _NB[name],
        args = [].slice.call(arguments,1);
      if(!fn){
        fn = registerFn(name);
      }
      fn.apply(_NB,args);
    }

    this.isApp = isApp;
    this.enableDebug = enableDebug;
    this.trigger = trigger;

    ['userInfo', 'login', 'share', 'modifytitle', 'updateBarButton', 'setBgColor', 'copy','closeweb'].forEach(function (key, index) {
      registerFn(key);
    });

    ['facebook', 'twitter', 'instagram'].forEach(function (key, index) {
      _NB['share_' + key] = function (data, callback) {
        _NB['share'](data, callback, key);
      }
      _NB[baseUpdateDataName + 'share_' + key] = _NB[baseUpdateDataName + 'share'];
    });

    ['unload'].forEach(function (key, index) {
      registerBeforeFn(key);
    });

  }

  return new NativeBridge(Navigator.protocol);
});
