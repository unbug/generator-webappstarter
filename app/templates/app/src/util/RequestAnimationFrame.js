define(function (require, exports, module) {
  //http://notes.jetienne.com/2011/05/18/cancelRequestAnimFrame-for-paul-irish-requestAnimFrame.html
  window.cancelRequestAnimFrame = (function () {
    return window.cancelAnimationFrame ||
      window.webkitCancelRequestAnimationFrame ||
      clearTimeout
  })();
  window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      function (/* function */ callback, /* DOMElement */ element) {
        return window.setTimeout(callback, 1000 / 60);
      };
  })();
});
