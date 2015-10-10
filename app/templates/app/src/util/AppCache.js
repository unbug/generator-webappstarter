define(function (require, exports, module) {
  /**
   * if you enable manifest in package.json,you don't need to require this module any more,gulp will auto includes it for you
   */
  var appCache = window.applicationCache;
  appCache.addEventListener('updateready', function(e) {
    if (appCache.status == appCache.UPDATEREADY){
      try{
        appCache.update();
        if (appCache.status == appCache.UPDATEREADY) {
          try{
            appCache.swapCache();
            window.location.reload(false);
          }catch(err){}
        }
      }catch(err){}
    }
  }, false);
});
