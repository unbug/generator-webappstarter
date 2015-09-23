define(function (require, exports, module) {
  var Subject = require('./Subject');
  var Class;

  /**
   * @param obj
   * @param config
   * @param promise
   */
  function apply(obj, config, promise) {
    if (config) {
      var attr;
      for (attr in config) {
        obj[attr] = promise ? promise(config[attr]) : config[attr];
      }
    }
  }

  /**
   *
   * @param obj
   * @param config
   * @param promise
   */
  function applyIf(obj, config, promise) {
    if (config) {
      var attr;
      for (attr in config) {
        if (!obj[attr]) {
          obj[attr] = promise ? promise(config[attr]) : config[attr];
        }
      }
    }
  }

  // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
  if (!Object.keys) {
    Object.keys = (function() {
      'use strict';
      var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

      return function(obj) {
        if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
          throw new TypeError('Object.keys called on non-object');
        }

        var result = [], prop, i;

        for (prop in obj) {
          if (hasOwnProperty.call(obj, prop)) {
            result.push(prop);
          }
        }

        if (hasDontEnumBug) {
          for (i = 0; i < dontEnumsLength; i++) {
            if (hasOwnProperty.call(obj, dontEnums[i])) {
              result.push(dontEnums[i]);
            }
          }
        }
        return result;
      };
    }());
  }
  //http://stackoverflow.com/a/16788517/479039
  function objectEquals(x, y) {
    if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
    // after this just checking type of one would be enough
    if (x.constructor !== y.constructor) { return false; }
    // if they are functions, they should exactly refer to same one (because of closures)
    if (x instanceof Function) { return x === y; }
    // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
    if (x instanceof RegExp) { return x === y; }
    if (x === y || x.valueOf() === y.valueOf()) { return true; }
    if (Array.isArray(x) && x.length !== y.length) { return false; }

    // if they are dates, they must had equal valueOf
    if (x instanceof Date) { return false; }

    // if they are strictly equal, they both need to be object at least
    if (!(x instanceof Object)) { return false; }
    if (!(y instanceof Object)) { return false; }

    // recursive object equality check
    var p = Object.keys(x);
    return Object.keys(y).every(function (i) { return p.indexOf(i) !== -1; }) &&
      p.every(function (i) { return objectEquals(x[i], y[i]); });
  }

  /**
   *
   * @param superClass
   * @param subClass
   */
  var extend = (function() {
    var F = function () {
    };
    return function (superClass, subClass) {
      F.prototype = superClass.prototype;
      subClass.prototype = new F();//空函数避免创建超类的新实例(超类可能较庞大或有大量计算)
      subClass.prototype.constructor = subClass;
      subClass.superclass = superClass.prototype;//superclass减少子类与超类之间的偶合
      //http://stackoverflow.com/questions/12691020/why-javascripts-extend-function-has-to-set-objects-prototypes-constructor-pro
      if (superClass.prototype.constructor == Object.prototype.constructor) {
        superClass.prototype.constructor = superClass;
      }
      return subClass;
    }
  })();

  function updateFactory(){
    var lastUpdate = 0,
      _timeout = 1000 * 60 * 5,
      names = {};
    /**
     *
     * @param timeout 时间倍数，默认是1
     * @param name
     * @returns {boolean}
     */
    this.isTimeout = function (timeout,name) {
      timeout = _timeout * (timeout || 1);
      name = name !== undefined?names[name]:lastUpdate;
      return !name || ( (new Date().getTime()) - name > timeout );
    }
    this.update = function (name) {
      var now = new Date().getTime();
      if(name !== undefined){
        if(names[name] === undefined){
          this.reset(name);
        }else{
          names[name] = now;
        }
      }else{
        lastUpdate = now;
      }
    }
    this.reset = function (name) {
      if(name !== undefined){
        names[name] = 0;
      }else{
        lastUpdate = 0;
      }
    }
    this.resetAll = function () {
      names = {};
      lastUpdate = 0;
    }
  }
  /**
   *
   * Model
   *
   *
   * Nested Model:
   * e.g.
   *    var testModel = new Model({
   *           store: new Model({
   *               request: function(){
   *                   console.log('store.request',this);
   *               }
   *           }),
   *           request: function(){
   *               console.log('request',this);
   *           }
   *       });
   *
   *    testModel.updated(function(){
   *           console.log(testModel.get());
   *           testModel.request();
   *       });
   *    testModel.set('1');
   *
   *    testModel.store.updated(function(){
   *           console.log(testModel.store.get());
   *           testModel.store.request();
   *       });
   *    testModel.store.set('2');
   */
  function Model(option) {
    Model.superclass.constructor.call(this);
    this.updated = this.register;
    this.refresh = this.notify;
    this.data;
    apply(this,option);

    //数据缓存更新
    this.updateFactory = updateFactory;
    this.timer = new updateFactory;
  }
  extend(Subject, Model);
  Model.prototype.store = function(storeid,data){
    this._cacheStore = this._cacheStore || {};
    if(data && storeid){
      if(typeof data == 'object' && toString.call(data) != '[object Array]'){
        data.__STORE_ID = storeid;
      }
      this._cacheStore[storeid] = data;
    }
  }
  /**
   *
   * @param data
   * @param storeid ,will cache in store,use getFromStoreById(storeid) to get access it
   * @param diff ,if true,and nothing changed between the new data in the old data,data observers will not got notify
   */
  Model.prototype.set = function (data,storeid,diff) {
    diff = diff && objectEquals(this.data,data);
    this.data = data;
    if(storeid){
      this.store(storeid,data);
    }
    !diff && this.refresh();
    this.timer.update();
  }
  /**
   *
   * @param clone will return a copy of the data
   * @returns {*}
   */
  Model.prototype.get = function (clone) {
    return (clone && typeof this.data=='object')?JSON.parse(JSON.stringify(this.data)):this.data;
  }
  /**
   *
   * @param storeid
   * @param clone ,will return a copy of the data
   * @returns {*|{}}
   */
  Model.prototype.getFromStoreById = function(storeid,clone){
    return storeid
      && this._cacheStore
      && ( (clone && typeof this._cacheStore[storeid]=='object')
        ?JSON.parse(JSON.stringify(this._cacheStore[storeid]))
        :this._cacheStore[storeid]);
  }
  //end Model

  Class = {
    objectEquals: objectEquals,
    apply: apply,
    applyIf: applyIf,
    extend: extend,
    Model: Model
  }
  //end Class

  return Class;
});
