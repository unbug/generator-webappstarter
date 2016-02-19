require('util/RequestAnimationFrame');

var localStorage = require('core/LocalStorage');
var Navigator = require('core/Navigator');
var Subject = require('core/Subject');
var Class = require('core/Class');
var Event = require('core/Event');

var LocalHost = require('util/LocalHost');
var localParam = require('util/LocalParam');
var RequestHandler = require('util/RequestHandler');

var randomList = require('util/RandomList');
var Num = require('util/Number');
var DateHandler = require('util/DateHandler');

var Core = {
  localStorage: localStorage,
  localHost: LocalHost,
  localParam: localParam,
  Navigator: Navigator,
  Class: Class,
  extend: Class.extend,
  RequestHandler: RequestHandler,
  Event: Event,

  Num: Num,
  randomList: randomList,
  DateHandler: DateHandler
};

window.Core = Core;
module.exports = Core;
