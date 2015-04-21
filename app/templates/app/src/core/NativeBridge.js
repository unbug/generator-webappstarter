define(function(require, exports, module) {
    var Navigator = require('./Navigator');

    /**
     * 与新闻客户端交互
     */
    function NativeBridge(protocolHandler){
        var emptyFn = function(){},
            appUA = (/Deja/ig).test(navigator.userAgent),
            androidReg = /Android/gi,
            debug = false,
            isAndroid = androidReg.test(navigator.platform) || androidReg.test(navigator.userAgent),
            Callbacks,Protocols;

        Callbacks = {
            afterEncrypt: emptyFn,
            afterShare: emptyFn,
            afterUserinfo: emptyFn,
            afterLogin: emptyFn,
            afterDevice: emptyFn,
            afterUploadImage: emptyFn,
            afterComment: emptyFn,
            afterOtherappinfo: emptyFn,
            afterActionbutton: emptyFn
        }
        Protocols = {
            share: 'share://',
            updateprofile: 'updateprofile://',
            encrypt: 'encrypt://',
            pushview: 'pushview://{TYPE}',
            userinfo: 'userinfo://',
            login: 'login://',
            device: 'device://',
            uploadImageByCamera: 'uploadimage://camera/{W}_{H}',
            uploadImageByAlbum: 'uploadimage://album/{W}_{H}',
            openComment: 'newsapp://comment/{BOARD_ID}/{DOC_ID}/{TITLE}',
            comment: 'comment://',
            otherappinfo: isAndroid?'otherappinfo://':'otherappinfo://intent/',
            copy: 'copy://',
            toolbar: 'docmode://toolbar/{COMMAND}',
            modifytitle: 'docmode://modifytitle/{TITLE}',
            actionbutton: 'docmode://actionbutton/{NAME}'
        }
        function enableDebug(){
            debug = true;
        }

        function updateAppUA(ua){
            appUA = new RegExp(ua,'ig').test(navigator.userAgent);
        }

        function isApp(ua){
            ua && updateAppUA(ua);
            return appUA || debug;
        }
        function protocol(action,callback){
            protocolHandler(action,true);
            //开启调试
            if(debug && callback){
                var _data = action.match(/[\w]:\/\/(.*)/);
                callback(_data && _data[1]);
            }
        }

        function afterCallback(rs,callback){
            callback = callback || emptyFn;
            callback(rs);
            callback = emptyFn;
        }
        window.__newsapp_share_done = function(rs){
            afterCallback(rs,Callbacks.afterShare);
        }
        window.__newsapp_encrypt_done = function(rs){
            afterCallback(rs,Callbacks.afterEncrypt);
        }
        window.__newsapp_userinfo_done = function(rs){
            afterCallback(rs,Callbacks.afterUserinfo);
        }
        window.__newsapp_login_done = function(rs){
            afterCallback(rs,Callbacks.afterLogin);
        }
        window.__newsapp_device_done = function(rs){
            afterCallback(rs,Callbacks.afterDevice);
        }
        window.__newsapp_upload_image_done = function(rs){
            afterCallback(rs,Callbacks.afterUploadImage);
        }
        window.__newsapp_comment_done = function(rs){
            afterCallback(rs,Callbacks.afterComment);
        }
        window.__newsapp_otherappinfo_done = function(rs){
            afterCallback(rs,Callbacks.afterOtherappinfo);
        }
        window.__newsapp_browser_actionbutton = function(rs){
            afterCallback(rs,Callbacks.afterActionbutton);
        }
        //更新用户资料
        function updateProfile(){
            protocol(Protocols.updateprofile);
        }
        /**
         * 登录
         * @param {Function} callback 成功回调
         */
        function login(callback){
            Callbacks.afterLogin = callback;
            protocol(Protocols.login,callback);
        }
        /**
         * 获取用户信息
         * @param {Function} callback 成功回调
         */
        function userInfo(callback){
            Callbacks.afterUserinfo = callback;
            protocol(Protocols.userinfo,callback);
        }
        /**
         * 获取设备信息
         * @param {Function} callback 成功回调
         */
        function device(callback){
            Callbacks.afterDevice = callback;
            protocol(Protocols.device,callback);
        }
        /**
         * 分享
         * @param {Function} callback 成功回调
         */
        function share(callback){
            Callbacks.afterShare = callback;
            protocol(Protocols.share,callback);
        }
        /**
         * 打开客户端视图
         * @param {String} type feedback,font,personalcenter,skin,font
         */
        function pushView(type){
            protocol(Protocols.pushview.replace('{TYPE}',type));
        }
        /**
         * 加密
         * @param {String} data 待加密数据
         * @param {Function} callback 成功回调
         */
        function encrypt(data,callback){
            Callbacks.afterEncrypt = callback;
            if(window.extra && window.extra.__newsapp_encrypt){
                afterCallback( window.extra.__newsapp_encrypt(data),Callbacks.afterEncrypt );
            }else{
                protocol(Protocols.encrypt+encodeURI(data),callback);
            }
        }
        /**
         * 上传图片 调用摄像头
         * @param {Integer} width 图片宽
         * @param {Integer} height 图片高
         * @param {Function} callback 成功回调
         */
        function uploadImageByCamera(width,height,callback){
            Callbacks.afterUploadImage = callback;
            protocol( Protocols.uploadImageByCamera.replace('{W}',width).replace('{H}',height),callback );
        }
        /**
         * 上传图片 调用图库
         * @param {Integer} width 图片宽
         * @param {Integer} height 图片高
         * @param {Function} callback 成功回调
         */
        function uploadImageByAlbum(width,height,callback){
            Callbacks.afterUploadImage = callback;
            protocol( Protocols.uploadImageByAlbum.replace('{W}',width).replace('{H}',height),callback );
        }
        /**
         * 打开文章跟贴
         * @param {String} boardid 版块ID
         * @param {String} docid 文章ID
         * @param {String} title 文章标题
         */
        function openComment(boardid,docid,title){
            protocol( Protocols.openComment.replace('{BOARD_ID}',boardid).replace('{DOC_ID}',docid).replace('{TITLE}',title||'') );
        }
        /**
         * 直接发表跟贴
         * @param {Function} callback 成功回调
         */
        function comment(callback){
            Callbacks.afterComment = callback;
            protocol( Protocols.comment,callback );
        }
        /**
         * 其他应用信息
         * @param {String} id
         * @param {Function} callback 成功回调
         */
        function otherappinfo(id,callback){
            Callbacks.afterOtherappinfo = callback;
            protocol( Protocols.otherappinfo+id,callback );
        }
        /**
         * 复制文本到剪贴板
         * @param {String} text
         */
        function copy(text){
            protocol( Protocols.copy+text );
        }
        /**
         * 显示隐藏正文工具栏
         * @param {String} command  show|hide
         */
        function toolbar(command){
            protocol( Protocols.toolbar.replace('{COMMAND}',command) );
        }
        /**
         * 更新标题
         * @param {String} title
         */
        function modifytitle(title){
            document.title = title || document.title;
            protocol( Protocols.modifytitle.replace('{TITLE}',encodeURI(title)) );
        }
        /**
         * 更新右上角功能菜单按钮
         * @param {String} name
         */
        function actionbutton(name,callback){
            Callbacks.afterActionbutton = callback;
            protocol( Protocols.actionbutton.replace('{NAME}',encodeURI(name)),callback );
        }
        return {
            isApp: isApp,
            login: login,
            userInfo: userInfo,
            device: device,
            share: share,
            encrypt: encrypt,
            updateProfile: updateProfile,
            uploadImageByCamera: uploadImageByCamera,
            uploadImageByAlbum: uploadImageByAlbum,
            pushView: pushView,
            openComment: openComment,
            comment: comment,
            otherappinfo: otherappinfo,
            copy: copy,
            toolbar: toolbar,
            modifytitle: modifytitle,
            actionbutton: actionbutton,
            enableDebug: enableDebug
        }
    }//end newsApp
    return new NativeBridge(Navigator.protocol);
});
