define(function (require, exports, module) {

  function localStorage() {
    var lcst = window.localStorage;

    /**
     * 读取
     *
     * @method getLocalValue
     * @param {String} id item id
     * @return {String} value
     */
    function getLocalValue(id) {
      if (lcst) {
        return lcst[id];
      } else {
        return null;
      }
    }

    /**
     * 保存/更新
     *
     * @method setLocalValue
     * @param {String}|{Object} id item id
     * @param {String} val value
     */
    function setLocalValue(id, val) {
      if (lcst) {
        if (typeof id === 'object') {
          for (var key in id) {
            try{id[key] && lcst.setItem(key, id[key]);}catch(err){}
          }
        } else {
          try{lcst.setItem(id, val);}catch(err){}
        }
      }
      return this;
    }

    /**
     * 删除
     * @param {Array}||{String} id
     */
    function removeLocalValue(id) {
      if (lcst) {
        if (typeof id === 'object') {
          for (var key in id) {
            try{lcst.removeItem(id[key]);}catch(err){}
          }
        } else {
          try{lcst.removeItem(id);}catch(err){}
        }
      }
      return this;
    }

    this.set = setLocalValue;
    this.get = getLocalValue;
    this.del = removeLocalValue;
  }

  return new localStorage;
});
