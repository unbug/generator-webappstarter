define(function(require, exports, module) {
    var Actions = require('app/resources/Actions');

    function Model(){
        var MODEL = this,
            Mdl = Core.Class.Model,
            lcStorage = Core.localStorage,
            getJSON = Core.RequestHandler.getJSON,
            postJSON = Core.RequestHandler.postJSON,
            userId,udid,NativeBridgeUserMeta,NativeBridgeDeviceMeta;

        this.getCookie = function(sKey) {
            return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
        }
        this.setCookie = function(name,value,days) {
            if (days) {
                var date = new Date();
                date.setTime(date.getTime()+(days*24*60*60*1000));
                var expires = "; expires="+date.toGMTString();
            }
            else var expires = "";
            document.cookie = name+"="+value+expires+"; path=/";
        }
        //校验登录 cookies
        this.verifyLoginCookie = function(){
            var S_INFO = this.getCookie('S_INFO'),
                S_INFO = S_INFO && S_INFO.split('|'),
                P_INFO = this.getCookie('P_INFO'),
                P_INFO = P_INFO && P_INFO.split('|');
            return (S_INFO && P_INFO && (P_INFO[2]!='2'));
        }
        this.saveLoginCookieTimeout = function(){
            var key = this.getUserId()+'__loginCookieTimer';
            lcStorage.set(key,new Date().getTime());
        }
        //校验 cookies 有效期，商城默认是1个小时过期，这里用 20 分钟
        this.verifyLoginCookieTimeout = function(minutes){
            var key = this.getUserId()+'__loginCookieTimer',
                last = lcStorage.get(key) || 0;
            minutes = minutes || 20;
            return ( (new Date().getTime())-last ) < minutes*60*1000;
        }
        this.setUdId = function(id){
            udid = id;
        }
        this.getUdId = function(){
            return udid;
        }
        this.setUserId = function(id){
            userId = id;
        }
        this.getUserId = function(){
            return userId;
        }
        this.getNativeBridgeUserMeta = function(){
            return NativeBridgeUserMeta;
        }
        this.setNativeBridgeUserMeta = function(data){
            NativeBridgeUserMeta = data;
            NativeBridgeUserMeta && this.setUserId(NativeBridgeUserMeta.name);
        }
        this.getNativeBridgeDeviceVersion = function(){
            return (NativeBridgeDeviceMeta && NativeBridgeDeviceMeta.v)|| '1.0.0';
        }
        this.getNativeBridgeDeviceMeta = function(){
            return NativeBridgeDeviceMeta;
        }
        this.setNativeBridgeDeviceMeta = function(data){
            NativeBridgeDeviceMeta = data;
            NativeBridgeDeviceMeta && this.setUdId(NativeBridgeDeviceMeta.u);
        }
        //校验所需要客户端版号不低于 version
        this.requiredNativeBridgeVersion = function(version){
            return Core.versionCompare(this.getNativeBridgeDeviceVersion(),version) != -1;
        }
        this.isLogined = function(){
            return !!userId;
        }

        //剩余人数
        this.user = new Mdl({
            request: function(callback){
                var _this = this;
                getJSON({
                    action: Actions.user,
                    complete: function(data){
                        if(data.success){
                            _this.set(data.data);
                        }
                        callback && callback(data.success);
                    }
                });
            }
        });

        //数据缓存更新
        var modelUpdate;
        this.initModelUpdateTimeout = function(){
            modelUpdate = {
                timeout: 1000*60*5,
                profile: 0,
                prizeAll: 0,
                liveTrade: 0,
                myPrize: 0,
                prizeKey: 0,
                myCashPrize: 0
            }
        }
        this.initModelUpdateTimeout();
        /**
         *
         * @param name
         * @param timeout 时间倍数，默认是1
         * @returns {boolean}
         */
        this.isModelUpdateTimeout = function(name,timeout){
            timeout = modelUpdate.timeout*(timeout||1);
            return !modelUpdate[name] || ( (new Date().getTime())-modelUpdate[name]>timeout );
        }
        this.updateModelTimeout = function(name,fresh){
            if(name===undefined){return;}
            if(modelUpdate[name]===undefined){
                this.resetModelTimeout(name);
            }else if(!fresh){
                modelUpdate[name] = new Date().getTime();
            }
        }
        this.resetModelTimeout = function(name){
            if(name===undefined){return;}
            modelUpdate[name] = 0;
        }
        //end 数据缓存更新
    }

    return new Model;
});
