var RequestHelper = require('app/model/RequestHelper');
var Actions = require('app/resources/Actions');
var Basic = require('app/model/Model');

var USER,
  Mdl = Core.Class.Model,
  lcStorage = Core.localStorage;

function User() {

}

User.prototype.user = new Mdl({
  request: function (data,callback) {
    RequestHelper.request(Actions.user,data,callback,this);
  }
});

User.prototype.userInfo = new Mdl({
  request: function (data,callback) {
    RequestHelper.JSONP({
      action: Actions.user+'&callback=afterRequestUserInfo'
    });
  }
});
window.afterRequestUserInfo = function(data){
  USER.userInfo.set(data);
}

USER = new User;

module.exports = USER;
