define(function (require, exports, module) {
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
