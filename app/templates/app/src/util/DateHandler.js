define(function (require, exports, module) {
  var DateHandler = (function () {
    function getStrDate(str) {
      var date;
      if (typeof str === 'string') {
        var arr = str.split(/[- :]/);
        date = new Date(arr[0], arr[1] - 1, arr[2], arr[3] || 00, arr[4] || 00, arr[5] || 00);
      }
      return date;
    }

    function dbl00(num) {
      return num < 10 ? '0' + num : num;
    }

    function getMeta(date) {
      if (!date) {
        return null;
      }
      var YYYY = date.getFullYear(),
        MM = date.getMonth(),
        DD = date.getDate(),
        hh = date.getHours(),
        mm = date.getMinutes(),
        ss = date.getSeconds();
      return {
        year: YYYY,
        month: dbl00(MM + 1),
        day: dbl00(DD),
        hour: dbl00(hh),
        minute: dbl00(mm),
        second: dbl00(ss)
      }
    }

    function formatStr(str) {
      var date = getStrDate(str);
      return getMeta(date);
    }

    function fromNowTo(date) {
      if (!date) {
        return null;
      }
      var _date;
      if (typeof date === 'string') {
        _date = getStrDate(date);
      } else if (typeof date === 'number') {
        _date = new Date(date);
      } else if (date.getTime) {
        _date = date;
      }
      if (!_date) {
        return null;
      }
      var old = _date.getTime(),
        cur = new Date().getTime(),
        diff = Math.abs(cur - old),
        day = Math.floor(diff / (24 * 60 * 60 * 1000)),
        hour = Math.floor((diff - (day * 24 * 60 * 60 * 1000)) / (60 * 60 * 1000)),
        minute = Math.floor((diff - (hour * 60 * 60 * 1000) - (day * 24 * 60 * 60 * 1000)) / (60 * 1000)),
        second = Math.floor((diff - (hour * 60 * 60 * 1000) - (day * 24 * 60 * 60 * 1000) - (minute * 60 * 1000)) / 1000);
      return {
        day: dbl00(day),
        hour: dbl00(hour),
        minute: dbl00(minute),
        second: dbl00(second)
      }
    }

    function timeLogFromNowTo(date) {
      var _date = fromNowTo(date);
      if (!_date) {
        return null
      }
      var day = parseInt(_date.day),
        hou = parseInt(_date.hour),
        min = parseInt(_date.minute);
      if (day > 0) {
        return day + ' days ago';
      } else if (hou > 0) {
        return hou + ' hours ago';
      } else if (min >= 3) {
        return min + ' mins ago';
      } else {
        return 'just now';
      }
    }

    function getDaysInMonth(y, m) {
      return /8|3|5|10/.test(--m) ? 30 : m == 1 ? (!(y % 4) && y % 100) || !(y % 400) ? 29 : 28 : 31;
    }

    return {
      getStrDate: getStrDate,
      getMeta: getMeta,
      formatStr: formatStr,
      fromNowTo: fromNowTo,
      timeLogFromNowTo: timeLogFromNowTo,
      getDaysInMonth: getDaysInMonth
    }
  }());

  return DateHandler;
});
