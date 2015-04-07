define(function(require, exports, module) {
    var Actions = require('../resources/Actions');
    var ThirdVendor = require('util/ThirdVendor');
    var BaseModel = require('app/model/Model');
    var BaseView = require('app/view/View');

    function Controller(){
        this.models = {
            Base: BaseModel
        };
        this.views = {
            Base: BaseView
        };
        //所有视图初始化前，需要获得客户端的用户登录信息
        //Core.Router.onReady(onUserinfo);

        Core.Router.onChanged(onViewChanged);

        var CTRL = this,
            isApp = Core.NativeBridge.isApp(),
            params = Core.localParam(),
            _userid = params.search['userid'],
            _partner = params.search['partner'];
        ///*Todo: debug user
        _userid && CTRL.models.Base.setUserId(_userid);
        //*/
        ///*Todo: debug user
        _partner && CTRL.models.Base.setApplyType(_partner);
        //*/

        //更新数据缓存时间
        Core.Event.on('resetModelUpdateTimeout',CTRL.models.Base.resetModelTimeout);
        //分享
        Core.Event.on('share',appShare);
        //去下载
        Core.Event.on('appDownload',redirectToDownload);
        //去更新
        Core.Event.on('appUpdate',appUpdate);
        //跳转出商城
        Core.Event.on('redirect',redirectToPage);
        //去登录
        Core.Event.on('login',onLogin);
        //去反馈
        Core.Event.on('feedback',onFeedback);
        //首页 赚更多金币
        Core.Event.on('appUserCenter',appUserCenter);
        //更新客户端用户资料
        Core.Event.on('appUpdateProfile',appUpdateProfile);
        //打开跟贴
        Core.Event.on('appOpenComment',appOpenComment);
        //复制文本
        Core.Event.on('appCopyText',appCopyText);
        //更新标题
        Core.Event.on('appModifyTitle',appModifyTitle);
        //修改右上角功能菜单
        Core.Event.on('appActionbutton',appActionButton);
        //修改右上角功能菜单成默认
        Core.Event.on('appActionDefaultButton',appActionDefaultButton);
        //修改右上角功能菜单成分享
        Core.Event.on('appActionShareButton',appActionShareButton);
        //tab 切换
        Core.Event.on('switchTab',switchTab);
        //触发暂时性动画
        Core.Event.on('trigerAnimate',trigerAnimate);
        //text 收展
        Core.Event.on('toggleTextSectionExpand',toggleTextSectionExpand);
        //统计
        Core.Event.on('analytics',analytics);

        //滚动到顶部
        Core.Event.on('scrollTop',scrollTop);
        //back
        Core.Event.on('back',function(action){
            Core.Router.back(action||-1);
        });
        function analytics(params,title){
            setTimeout(function(){
                var url = Actions.analytics+'?devevent=1'+(params?('&'+params):'');
                //android和iOS
                if($.os.ios && !$.os.android){
                    url += '&ios';
                }else if($.os.android){
                    url += '&android';
                }
                Core.Navigator.protocol(url,true);
            },0);
        }
        function scrollTop(){
            var top = Math.min( Math.min(window.pageYOffset,document.documentElement.scrollTop||document.body.scrollTop),window.scrollY ),
                start = top,
                to = 0,
                timer = 0,
                change = to - start,
                currentTime = 0,
                increment = 20,
                duration = 500;
            (function animloop(){
                // increment the time
                currentTime += increment;
                if(start<2 || CTRL.views.Base.GlobalTouch.touched || currentTime>duration){
                    if(start<2){
                        window.scrollTo(0,1);
                    }
                    cancelRequestAnimFrame(timer);
                    return;
                }
                window.scrollTo(0,Math.easeInOutQuad(currentTime, start, change, duration));
                timer = requestAnimFrame(animloop);
            })();
        }

        function onViewChanged(){
            appModifyTitle();
            CTRL.views.Base.msgbox.hideLoading();
        }

        function onUserinfo(){
            if(isApp){
                Core.NativeBridge.userInfo(function(rs){
                    if(rs){
                        CTRL.models.Base.setNativeBridgeUserMeta(rs);

                        //onLogin();
                        //return;
                        if(CTRL.models.Base.verifyLoginCookie() && CTRL.models.Base.verifyLoginCookieTimeout()){
                            Core.Router.run();
                        }else{
                            onLogin();
                        }
                    }else{
                        Core.Router.run();
                    }
                });
                Core.NativeBridge.device(function(rs){
                    if(rs){
                        CTRL.models.Base.setNativeBridgeDeviceMeta(rs);
                    }
                });
            }else{
                Core.Router.run();
            }            
        }

        function onLogin(arg){
            if(isApp){
                Core.NativeBridge.login(function(rs){
                    if(rs){
                        CTRL.models.Base.saveLoginCookieTimeout();
                        CTRL.models.Base.initModelUpdateTimeout();
                        CTRL.models.Base.setNativeBridgeUserMeta(rs);
                        Core.Router.run();
                    }
                    /* 注释掉避免开启DEBUG模式时，出现死循环的问题
                    else{
                        Core.Router.run();
                    }
                    */
                });
            }else{
                CTRL.views.Base.msgbox.showDownload({
                    yesCallback: function(){
                        redirectToDownload(Actions.main+(arg||''));
                    }
                });
            }
        }
        function onFeedback(){
            Core.Navigator.protocol('mailto:mozat@mozat.com?subject=Suggestion',true);
        }
        function switchTab(el,tabs,tabContents){
            if(!tabs || !tabContents){return;}
            var isClicked = !!el;
            el = el || tabs[0];
            for(var i=0;i<tabs.length;i++){
                if(tabs[i] == el){
                    tabs[i].classList.add('on');
                    trigerAnimate( tabContents.eq(i) );
                    tabContents[i] && tabContents[i].classList.add('show');
                    isClicked && Core.Event.trigger( 'analyticsCurView','tab='+i);
                }else{
                    tabs[i].classList.remove('on');
                    tabContents[i] && tabContents[i].classList.remove('show');
                }
            }
            Core.Event.trigger( 'analyticsCurView');
        }
        function trigerAnimate(el,classname,timeout){
            if(!el){return;}
            classname = classname || 'animated';
            timeout = timeout || 1200;
            el.animTimer && clearTimeout(el.animTimer);
            el.addClass(classname);
            el.animTimer = setTimeout(function(){
                el.removeClass(classname);
            },timeout);                  
        }        
        function toggleTextSectionExpand(el){
            el && el.classList.toggle('expand');
        }

        function appUpdate(msg){
            redirectToApp(function(){
                CTRL.views.Base.msgbox.showDialog({
                    msg: msg||'Please up to date your App',
                    noText: 'Close',
                    yesText: 'Update',
                    yesCallback: function(){
                        downloadNativeBridgeInApp();
                    }
                });
            });
        }
        function appUserCenter(){
            redirectToApp(function(){
                Core.NativeBridge.pushView('personalcenter');
            });        
        }
        function appShare(callback){
            redirectToApp(function(){
                Core.NativeBridge.share(callback);
            });   
        }
        
        function appOpenComment(boardid,docid,title){
            redirectToApp(function(){
                Core.NativeBridge.openComment(boardid,docid,title);
            });
        }
        function appUpdateProfile(){
            if(isApp){
                Core.NativeBridge.updateProfile();
            }           
        }
        function appCopyText(text){
            if(isApp){
                Core.NativeBridge.copy(text);
            }
        }
        function appModifyTitle(title){
            title = title || document.title;
            document.title = title;
            if(isApp){
                Core.NativeBridge.modifytitle(title);
            }
        }
        function appActionButton(name,callback){
            if(isApp){
                Core.NativeBridge.actionbutton(name,callback);
            }
        }
        function appActionShareButton(callback){
            appActionButton('分享',function(){
                appShare(callback);
            });
        }
        function appActionDefaultButton(){
            appActionButton('',function(){});
        }
        function downloadNativeBridgeInApp(){
            var url = Actions.NativeBridgeAndroid;
            if($.os.ios && !$.os.android){
                url  = Actions.NativeBridgeIos;
            }
            window.location = url;
        }
        //打开客户端原生视图
        function redirectToApp(callback,link){
            if(isApp){
                callback && callback();
            }else{
                CTRL.views.Base.msgbox.showDownload({
                    yesCallback: function(){
                        redirectToDownload(link || window.location.href);
                    }
                });
            }
        }
        function redirectToDownload(link,autoopen){
            link = link?('#url=NativeBridge://web/'+link):'';
            redirectToPage(Actions.NativeBridgeDwonload+(autoopen?'?autoopen=1':'')+link);
        }   
        function redirectToPage(link){
            if(link){
                !(/__NativeBridge_target/g.test(link)) && appActionDefaultButton();
                window.location = link;
            }
        }
        
    }//end Controller    
    return new Controller;
});