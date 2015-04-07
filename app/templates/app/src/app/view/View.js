define(function(require, exports, module) {
    var Actions = require('../resources/Actions');
    var Msgbox = require('widget/Msgbox');
    //var WechatShare = require('util/WechatShare');
    //var YiXinShare = require('util/YiXinShare');

    var BaseModel = require('app/model/Model');

    function View(config){
        this.models = {
            Base: BaseModel
        }

        var VIEW = this,
            els,
            params = Core.localParam(),
            isApp = Core.NativeBridge.isApp();
        //click事件
        this.tapEvent = $.os.ios || $.os.android?'tap':'click';

        function init(){
            Core.MetaHandler.fixViewportWidth();
            if($.os.ios && parseInt($.os.version)<7){
                Core.MetaHandler.setContentProperty('viewport','initial-scale',0.5);
            }
            initEls();
            bindEvent();
            els.body.css({'visibility': 'visible'});
            VIEW.hide();
        };//end init

        function initEls(){
            var body = $('body');
            els = {
                body: body,
                views: body.children('.view')
            }
            VIEW.GlobalTouch = {
                preventMove: false,
                touched: false
            }
            window.GlobalTouch = VIEW.GlobalTouch;
            VIEW.msgbox = new Msgbox({
                GlobalTouch : VIEW.GlobalTouch
            });
        }
        this.getEls = function(){
            return els;
        }
        function bindEvent(){
            document.addEventListener('touchmove', function (e) { 
                VIEW.GlobalTouch.preventMove && e.preventDefault();  
            },false);
            document.addEventListener('touchstart', function (e) { 
                VIEW.GlobalTouch.touched = true;
            },false);
            document.addEventListener('touchend', function (e) { 
                VIEW.GlobalTouch.touched = false;
            },false);
            if(VIEW.tapEvent=='tap'){
                els.body.on('click','a',function(e){
                    e.preventDefault();
                    return false;
                });
                els.body.on('tap','a',function(){
                    Core.Event.trigger('redirect',this.href);
                });
            }
            els.body.on(VIEW.tapEvent,'.fake-link',function(){
                Core.Event.trigger('redirect',this.getAttribute('data-link'));
            });
            els.body.on(VIEW.tapEvent,'* [data-analytics]',function(){
                Core.Event.trigger('analyticsCurView',this.getAttribute('data-analytics'));
            });
        }
        this.show = function(viewCls){
            this.hide();

            els.views.each(function(){
                var view = $(this);
                view.hasClass(viewCls) && view.addClass('show');
            });
            $('.footer-section').removeClass('hide');
            return this;
        }
        this.hide = function(){
            els.views.removeClass('show');
            return this;
        }

        /**
         *  weiboMsg String  微博文案
            weiboImg    String  微博配图
            weixinTitle String  微信标题
            weixinMsg   String  微信文案
            weixinImg   String  微信配图
            url 分享连接
         */
        this.renderShare = function(option){
            return;
            option = option || {};
            var url = option.url || Actions.main,
                title = '@客户端 有态度俱乐部',
                msg = '好礼等你抢~',
                weixinTitle = option.weixinTitle || title.replace('@','').replace(' ',''),
                weixinMsg = option.weixinMsg || msg;
            option.weiboMsg = option.weiboMsg?( option.weiboMsg+' '+url ): (title+msg+' '+url);
            els.shareText.html( option.weiboMsg);
            els.sharePhoto.html( option.weiboImg || '' );

            els.shareWXTitle.html(weixinTitle);
            els.shareWXText.html( weixinMsg );
            els.shareWXThumb.html( option.weixinImg || '' );
            els.shareWXUrl.html( url );

            updateWechatShareMeta(weixinTitle,weixinMsg,url,option.weixinImg);
            updateYiXinShareMeta(weixinMsg,option.weixinImg);
            return this;
        }
        this.renderShareCommon = function(d,url){
            if(d){
                var option = {
                    weiboMsg: d.weiboMsg,
                    weiboImg: d.weiboImg,
                    weixinTitle: d.weixinTitle,
                    weixinMsg: d.weixinMsg,
                    weixinImg: d.weixinImg,
                    url: url
                }
                VIEW.renderShare(option);
            }
        }

        function updateWechatShareMeta(title,content,link,img){
            WechatShare({
                "appid": "",
                "img_url": img || Actions.NativeBridgeLogo,
                "img_width": "200",
                "img_height": "200",
                "link": link || window.location,
                "url": link || window.location,
                "desc": content || document.title,
                "content": content || document.title,
                "title": title || document.title
            });
        }
        function updateYiXinShareMeta(content,img){
            YiXinShare({content:content||document.title,img:img||Actions.NativeBridgeLogo});
        }

        this.lazyLoadImg = function (el){
            el && el.find("img").unveil( 200,function() {
                this.onload = function() {
                    this.style.opacity = 1;
                };
            } );
        }


        init();
    }//end View
    return new View;
});
