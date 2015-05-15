define(function (require, exports, module) {
  function Subject(subject) {
    this._subject = subject;
    this.observers = [];
  }

  Subject.prototype = {
    /**
     * @param {Function}|{Boject} observer
     */
    register: function (observer) {
      if (!observer) {
        throw new Error('An observer can not be undefined!');
      } else if (typeof observer === 'object' && typeof observer.update !== 'function') {
        throw {
          name: 'Error',
          method: 'Subject.register',
          message: 'An observer object can not register without an update method!'
        }
      }
      this.unregister(observer);//防止重复注册
      this.observers.push(observer);
      return this;
    },
    /**
     * @param {Function}|{Boject} observer
     */
    unregister: function (observer) {
      this.observers = this.observers.filter(function (obsv) {
        if (obsv !== observer) {
          return obsv;
        }
      });
      return this;
    },
    notify: function () {
      var args = [].slice.call(arguments);
      this.observers.forEach(function (obsv) {
        if (typeof obsv === 'function') {
          obsv.apply(obsv, args);
        } else {
          obsv.update.apply(obsv, args);
        }
      });
      return this;
    }
  }
  return Subject;
});
