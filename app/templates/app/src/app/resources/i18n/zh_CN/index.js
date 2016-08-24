var Msgbox = require('./Msgbox');

function zh_CN() {
  //extend from super
  zh_CN.superclass.constructor.call(this);

  this.Msgbox = Msgbox;
}
module.exports = zh_CN;
