define(function (require, exports, module) {
  var getJSON = Core.RequestHandler.getJSON,
    postJSON = Core.RequestHandler.postJSON,
    JSONP = Core.RequestHandler.JSONP;

  function request(action,data,callback,scope,options) {
    options = options || {};
    var __STORE_ID,conf;
    data = data || {};
    data._t = new Date().getTime();
    __STORE_ID = data.__STORE_ID;
    delete data.__STORE_ID;
    conf = {
      action: action,
      data: data,
      complete: function (data) {
        if (data.success) {
          scope && scope.set && scope.set(data.data,__STORE_ID);
        }
        callback && callback(data.success);
      }
    };
    for(var name in options) conf[name]=options[name];
    conf.action = action;
    conf.data = data;
    getJSON(conf);
  }
  function post(action,data,callback,scope,options) {
    options = options || {};
    var conf = {
      action: action,
      data: data,
      contentType: options.contentType||"application/json;charset=utf-8",
      complete: function (data) {
        if (data.success) {
          scope && scope.set && scope.set(data.data);
        }
        callback && callback(data.success);
      }
    };
    for(var name in options) conf[name]=options[name];
    conf.action = action;
    conf.data = data;
    postJSON(conf);
  }

  return {
    getJSON: getJSON,
    postJSON: postJSON,
    JSONP: JSONP,
    request: request,
    post: post
  };
});
