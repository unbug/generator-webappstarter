define(function (require, exports, module) {
  var Actions = require('app/resources/Actions');
  var Basic = require('app/model/Model');

  var USER,
    Mdl = Core.Class.Model,
    lcStorage = Core.localStorage,
    getJSON = Core.RequestHandler.getJSON,
    postJSON = Core.RequestHandler.postJSON,
    JSONP = Core.RequestHandler.JSONP;

  function User() {

  }

  //剩余人数
  User.prototype.user = new Mdl({
    request: function (data,callback) {
      var _this = this;
      getJSON({
        data: data,
        action: Actions.user,
        complete: function (data) {
          if (data.success) {
            _this.set(data.data);
          }
          callback && callback(data.success);
        }
      });
    }
  });

  //userInfo
  User.prototype.userInfo = new Mdl({
    request: function (data,callback) {
      JSONP({
        action: Actions.user+'&callback=afterRequestUserInfo'
      });
    }
  });
  window.afterRequestUserInfo = function(data){
    USER.userInfo.set(data);
  }

  USER = new User;

  return USER;
});
