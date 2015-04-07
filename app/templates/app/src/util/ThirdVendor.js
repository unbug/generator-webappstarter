define(function(require, exports, module) {
    /**
     * 第三方平台
     */
    var ua = window.navigator.userAgent;
    var vendor = null;
    function isUA(name){
        var reg = new RegExp(name,'gi');
        return reg.test(ua);
    }
    if( isUA('NewsApp') ){
        vendor = {
            code: 'NTES',
            name: '网易新闻'
        }
    }
    else if( isUA('weibo') ){
        vendor = {
            code: 'WB',
            name: '微博'
        }
    }
    else if( isUA('MicroMessenger') ){
        vendor = {
            code: 'WX',
            name: '微信'
        }
    }
    else if( isUA('QQ') ){
        vendor = {
            code: 'QQ',
            name: 'QQ'
        }
    }
    else if( isUA('YiXin') ){
        vendor = {
            code: 'YX',
            name: '易信'
        }
    }
    
    return vendor;
});
