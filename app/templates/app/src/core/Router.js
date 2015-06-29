define(function (require, exports, module) {
  var Pubsub = require('./Pubsub');
  var Subject = require('./Subject');
  var HashHandler = require('./HashHandler');

  /**
   *
   * Router 初始化流程：
   * init(withAction) --> onReady 是否注册有 Callback  --> (是)执行所有 Callback (在关键Callback里，手动执行 run 来强制刷新是推荐的）
   *                                                  --> (否)执行 run
   *
   *
   * Hash 变化事件执行流程：
   * Hash变化（或者显示调用 run,forward,back方法） --> 执行 onChanged 注册的所有事件 --> 执行 subscribe 注册的与 Hash 关联的所有事件
   *
   * subscribe 注册的事件回调方法传递参数:
   * actionValue - 当前 action 之后的字符串，如/user/id=1&name=test 对应 action 是 /user/ ，actionValue 是 id=1&name=test
   * request - { action: 当前action字符串,
                   valeu: actionValue,
                   hash: {
                    curHash: String,
                    newHash: String,
                    oldHash: String
                   },
                   query: actionValue的键值对，如 {id:1,name:test}
                 }
   *
   * 本 Router 暂不支持正则表达式
   */
  function Router(Pubsub, HashHandler) {
    var _Router = this,
      android = /Android/gi.test(navigator.userAgent),
      iOS = /(iPad|iPhone|iPod)/gi.test(navigator.userAgent) && !android,
      UN_SUB_NAME = '__UN_SUBSCRIBED_ACTION',
      INIT_HASH_STR = formatHash(HashHandler.get()),
      currentAction = INIT_HASH_STR,
      currentQureyStr = '',
      _isFroward = true,
      actionsHistory = [INIT_HASH_STR],
      isReady = false,
      initCallback,
      readyCallbacks = [],
      changedCallbacks = [];

    //iOS使用pushstate,解决iOS7没有历史的问题
    if (iOS) {
      window.addEventListener('popstate', locationHashChanged, false);
    } else {
      window.addEventListener('hashchange', locationHashChanged, false);
    }

    //开启锚点，解决页面自动滚动的问题
    var _st = document.createElement('style'),
      _div = document.createElement('div');
    _st.innerText = '.Router-anchor{position: fixed; top: 0; left: 0;}';
    _div.className = 'Router-anchor';
    document.body.appendChild(_st);
    document.body.appendChild(_div);

    function getQuery(search) {
      search = search || currentQureyStr || '';
      var fn = function (str, reg) {
        if (str) {
          var data = {};
          str.replace(reg, function ($0, $1, $2, $3) {
            data[$1] = $3;
          });
          return data;
        }
      }
      return fn(search, new RegExp("([^?=&]+)(=([^&]*))?", "g")) || {};
    }

    function formatHash(hash) {
      if (hash) {
        //hash后不能带search值
        hash = hash.replace(/\?.*/g, '');
      }
      return hash;
    }

    function locationHashChanged(e) {
      e && e.preventDefault();
      var args = arguments[0] || {},
        hash;
      hash = {
        curHash: formatHash(HashHandler.get()),
        newHash: formatHash(HashHandler.getByURL(args.newURL)),
        oldHash: formatHash(HashHandler.getByURL(args.oldURL))
      }
      currentAction = hash.curHash;
      setLastAction(hash.curHash);
      initCallback && initCallback(hash.curHash, hash);
      if (isReady) {
        doChanged(hash.curHash, hash);
        dispatch(hash);
      }
      hash.curHash && addAnchor(hash.curHash);
      return false;
    }

    function dispatch(hash) {
      var topics = Pubsub.getTopics(),
        published = false;
      if (hash.curHash !== undefined) {
        for (var i = 0; i < topics.length; i++) {
          var key = topics[i];
          if (key !== UN_SUB_NAME) {
            hash.curHash.replace(new RegExp(key + '(.*)', 'g'), function ($1, $2) {
              if ($1) {
                published = true;
                Pubsub.publish(key, $2, {
                  action: key,
                  value: $2,
                  hash: hash,
                  query: getQuery($2)
                });
                currentQureyStr = $2;
              }
            });
          }
        }
      }
      if (!published) {
        Pubsub.publish(UN_SUB_NAME, hash.curHash, {
          action: hash.curHash,
          value: hash.curHash,
          hash: hash,
          query: getQuery(hash.curHash)
        });
        currentQureyStr = hash.curHash;
      }
    }

    /**
     * 手动初始化
     * 如在onReady里注册了很多的callback，可以通过此方法手动初始化它们
     * 如果带上 withAction 可实现：
     *      在所有主题被订阅之前，在页面首次加载之初，初始化一个与源hash不同且暂未被订阅的主题,最终仍然跳转到源hash
     *
     * 此方法并不是必要的
     * @param {String} withAction 初始化的action
     */
    function init(withAction) {
      if ((withAction === null) || (withAction === undefined) || (withAction === '' )) {
        ready();
      } else {
        //注意原初始化的action不应该包含在将初始化的hash里
        var reg = new RegExp('^' + withAction + '(.*)', 'i');
        if (INIT_HASH_STR && !reg.test(INIT_HASH_STR)) {
          initCallback = function (curHash) {
            if (curHash === INIT_HASH_STR) {
              initCallback = null;
              setTimeout(function () {
                ready();
              });
            } else if (curHash === withAction) {
              forward(INIT_HASH_STR);
            }
          };
          forward(withAction);
        } else {
          ready();
        }
      }
      return Pubsub;
    }

    /**
     * 强制刷新
     * 在无需引起 hash 变化情况下，强制执行与当前 hash 联调的所有主题一次
     * 流程：
     * 执行 onChanged 注册的所有事件 --> 执行 subscribe 注册的与 Hash 关联的所有事件
     */
    function run() {
      locationHashChanged();
      return Pubsub;
    }

    /**
     * 订阅所有没有被注册的主题
     * @param {Object} observer
     */
    function onUnsubscribed(observer) {
      Pubsub.subscribe(UN_SUB_NAME, observer);
      return Pubsub;
    }

    /**
     * 当hash发生变化时触发,会先于所有订阅的主题触发
     */
    function onChanged(callback) {
      if (typeof callback === 'function') {
        changedCallbacks.push(callback);
      }
      return Pubsub;
    }

    /**
     * 手动执行init方法会执行通过此方法注册的所有callback方法
     * @param callback
     */
    function onReady(callback) {
      if (typeof callback === 'function') {
        readyCallbacks.push(callback);
      }
      return Pubsub;
    }

    function ready() {
      isReady = true;
      //如果 onReady 方法中有回调则执行回调
      //注意，onReady 的回调里需要有且仅有一个要显示调用 run 来强制执行所有主题的调回
      if (readyCallbacks.length) {
        while (readyCallbacks.length) {
          readyCallbacks.shift().call(_Router, Pubsub)
        }
      }
      //否则自动强制执行所有主题
      else {
        run();
      }
    }

    function doChanged() {
      var i = 0, l = changedCallbacks.length;
      for (; i < l; i++) {
        changedCallbacks[i].apply(undefined, arguments);
      }
    }

    /**
     * 跳转到一个指定的主题
     * @param {String}|{Number} action
     */
    function forward(action) {
      _isFroward = true;
      if (action === null) {
        window.history.forward();
      } else if (typeof action === 'number') {
        if (action == -1) {
          _isFroward = false;
        }
        window.history.go(action);
      } else if (typeof action === 'string') {
        if (iOS) {
          window.history.pushState(null, null, '#' + action);
          run();
        } else {
          HashHandler.set(action);
        }
      }
      return Pubsub;
    }

    /**
     * 返回上一主题
     * action仅在解决当不确实是否有浏览历史，并且又需要跳转到一个指定的hash值时
     * 优先级是： 浏览器历史 > actionsHistory > action
     * @param {String}|{Number} action
     */
    function back(action) {
      var ac = getLastAction() || action || -1;
      //如果浏览器有历史则走历史
      if (window.history.length > 1) {
        ac = -1;
      }
      forward(ac);
      return Pubsub;
    }

    function setLastAction(action) {
      var ac = actionsHistory.pop();
      if (ac !== undefined && ac !== action) {
        actionsHistory.push(ac);
      }
      actionsHistory.push(action);
    }

    function getLastAction() {
      //pop两次是因为最后一次是当前的
      actionsHistory.pop();
      return actionsHistory.pop();
    }

    function setFirstAction(action) {
      var ac = actionsHistory.shift();
      if (ac !== undefined && ac !== action) {
        actionsHistory.unshift(ac);
      }
      actionsHistory.unshift(action);
    }

    function getFirstAction() {
      return actionsHistory.shift();
    }

    function isFroward() {
      return _isFroward;
    }

    /**
     * 解决历史滚动位置记录的问题，保证视图切换总在最顶部
     * @param id
     */
    function addAnchor(id) {
      return;//暂时停用此功能

      var _d = document.createElement('div'), __d;
      _d.id = id;
      _div.appendChild(_d);
      __d = document.getElementById(id);
      if (__d && __d !== _d) {
        _div.removeChild(_d);
      }
    }

    /**
     * 校验是否存在与当前的 action 匹配的 action
     * @param action {Array}|{String}
     * @returns {boolean}
     */
    function currentMatch(action) {
      var ac = [], i = 0, l;
      if (typeof action === 'string') {
        ac.push(action)
      } else if (toString.call(action) == '[object Array]') {
        ac = ac.concat(action)
      }
      l = ac.length;
      for (; i < l; i++) {
        if ((new RegExp('^' + ac[i] + '(.*)', 'i')).test(currentAction || UN_SUB_NAME)) {
          return true;
        }
        ;
      }
      return false;
    }

    Pubsub.initHash = INIT_HASH_STR;
    Pubsub.init = init;
    Pubsub.run = run;
    Pubsub.forward = forward;
    Pubsub.back = back;
    Pubsub.isFroward = isFroward;
    Pubsub.currentMatch = currentMatch;
    Pubsub.onReady = onReady;
    Pubsub.onChanged = onChanged;
    Pubsub.onUnsubscribed = onUnsubscribed;
    Pubsub.getQuery = getQuery;
    Pubsub.getUnsubscribedAction = function () {
      return UN_SUB_NAME;
    };


    return Pubsub;
  }

  return Router(new Pubsub(Subject), HashHandler);
});
