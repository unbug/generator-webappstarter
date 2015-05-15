define(function (require, exports, module) {
  /**
   * window.location.search
   * window.location.hash
   */
  function localParam(search, hash) {
    search = search || window.location.search;
    hash = hash || window.location.hash;
    var fn = function (str, reg) {
      if (str) {
        var data = {};
        str.replace(reg, function ($0, $1, $2, $3) {
          data[$1] = $3;
        });
        return data;
      }
    }
    return {
      search: fn(search, new RegExp("([^?=&]+)(=([^&]*))?", "g")) || {},
      hash: fn(hash, new RegExp("([^#=&]+)(=([^&]*))?", "g")) || {}
    };
  }

  return localParam;
});
