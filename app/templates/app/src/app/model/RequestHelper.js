define(function (require, exports, module) {
  var getJSON = Core.RequestHandler.getJSON,
    postJSON = Core.RequestHandler.postJSON,
    JSONP = Core.RequestHandler.JSONP;

  function request(action,data,callback,scope,options) {
    options = options || {};
    getJSON({
      action: action,
      data: data,
      complete: function (data) {
        if (data.success) {
          scope && scope.set && scope.set(data.data);
        }
        callback && callback(data.success);
      }
    });
  }
  function post(action,data,callback,scope,options) {
    options = options || {};
    postJSON({
      action: action,
      data: data,
      contentType: options.contentType||"application/json;charset=utf-8",
      complete: function (data) {
        if (data.success) {
          scope && scope.set && scope.set(data.data);
        }
        callback && callback(data.success);
      }
    });
  }

  return {
    getJSON: getJSON,
    postJSON: postJSON,
    JSONP: JSONP,
    request: request,
    post: post
  };
});
