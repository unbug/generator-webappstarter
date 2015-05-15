define(function (require, exports, module) {
  if (!window.location.origin) {
    window.location.origin = window.location.protocol
      + "//" + window.location.hostname
      + (window.location.port ? ':' + window.location.port : '');
  }
  return window.location.origin;
});
