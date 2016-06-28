var StoreHelper = require('app/model/StoreHelper');
var Actions = require('app/resources/Actions');
var Basic = require('app/model/Model');

var Mdl = Core.Class.Model,
  lcStorage = Core.localStorage;

function User() {

}

User.prototype.user = StoreHelper.requestStore(Actions.user);

User.prototype.userInfo = StoreHelper.JSONPStore(Actions.user);

module.exports = new User();
