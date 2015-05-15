define(function (require, exports, module) {
  var Class = require('./Class');
  var Pubsub = require('./Pubsub');
  var Subject = require('./Subject');


  function Event(Subject) {
    Event.superclass.constructor.call(this, Subject);
    this.on = this.subscribe;
    this.off = this.unsubscribe;
    this.trigger = this.publish;
  }

  Class.extend(Pubsub, Event);
  return new Event(Subject);
});
