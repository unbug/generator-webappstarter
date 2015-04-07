define(function(require, exports, module) {
    var thisPage = window.location.href
        //注意，保留search 是为了避免微信自动追加的应用检测状态值
        //.replace(window.location.search,'')
        .replace(window.location.hash,'');
    var thisPath = thisPage.substring(0,thisPage.lastIndexOf('/')+1);

    ///*official
    var Actions = {
        user:  Core.localHost +'/user/list.php',

        main: thisPath+'index.html',
        analytics: thisPath+'analytics.html'
    }
    //*/

    ///_DEBUG_*Todo: debug actions
    var Actions = {
        user:  'data/user.json',

        main: thisPath+'index.html',
        analytics: thisPath+'analytics.html'
    }
    //*/
   return Actions;
});