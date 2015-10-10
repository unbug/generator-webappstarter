define(function (require, exports, module) {
  require('util/RequestAnimationFrame');
  require('util/Easing');
  require('util/Unveil');
  require('util/VirtualDOMLite');

  var Navigator = require('core/Navigator');
  var Subject = require('core/Subject');
  var MicroTmpl = require('core/MicroTmpl');
  var Class = require('core/Class');
  var NativeBridge = require('core/NativeBridge');
  var Router = require('core/Router');
  var HashHandler = require('core/HashHandler');
  var Event = require('core/Event');

  var localStorage = require('util/LocalStorage');
  var LocalHost = require('util/LocalHost');
  var localParam = require('util/LocalParam');
  var MetaHandler = require('util/MetaHandler');
  var RequestHandler = require('util/RequestHandler');
  var versionCompare = require('util/versionCompare');

  var randomList = require('util/RandomList');
  var Num = require('util/Number');
  var DateHandler = require('util/DateHandler');

  var Core = {
    localStorage: localStorage,
    localHost: LocalHost,
    localParam: localParam,
    Navigator: Navigator,
    MetaHandler: MetaHandler,
    Subject: Subject,
    microTmpl: MicroTmpl(),
    Class: Class,
    extend: Class.extend,
    HashHandler: HashHandler,
    RequestHandler: RequestHandler,
    NativeBridge: NativeBridge,
    versionCompare: versionCompare,
    Event: Event,
    Router: Router,

    Num: Num,
    randomList: randomList,
    DateHandler: DateHandler
  };

  //开启客户端调试,无需客户端环境模拟客户端接口
  if (localParam().search['debug'] == 1) {
    Core.NativeBridge.enableDebug();
  }
  window.Core = Core;
  return Core;
});
