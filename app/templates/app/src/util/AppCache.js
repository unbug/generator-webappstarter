define(function(require, exports, module) {
    var appCache = window.applicationCache;
    appCache.addEventListener('updateready', function(e) {
        if (appCache.status == appCache.UPDATEREADY){
            try{
                appCache.update();
                if (appCache.status == window.applicationCache.UPDATEREADY) {
                    try{
                        appCache.swapCache();
                    }catch(err){}
                }
            }catch(err){}   
            window.location.reload();
          }
    }, false); 
});
