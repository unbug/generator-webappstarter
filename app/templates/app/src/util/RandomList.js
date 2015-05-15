define(function (require, exports, module) {
  /**
   * 随机数组
   */
  function randomList(list, len, verify, ratio) {
    var rs = [], _list = list.slice(0);
    len = len || _list.length;
    ratio = ratio ? ratio : 0;
    function rd(_array) {
      _array = _array.sort(function () {
        return (0.5 - Math.random());
      });
    }

    while (ratio) {
      rd(_list);
      ratio--;
    }
    if (_list.length <= len) {
      rs = _list;
    } else {
      while (rs.length < len) {
        var index = Math.floor(Math.random() * _list.length),
          item = _list[index];
        if (( verify && verify.call(this, item, _list) ) || !verify) {
          rs.push(item);
          _list.splice(index, 1);
        }
      }
    }
    return rs;
  }

  return randomList;
});
