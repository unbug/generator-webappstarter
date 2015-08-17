define(function(require, exports, module) {
  var Actions = require('app/resources/Actions');
  var Msgbox = require('widget/Msgbox');
  var WechatShare = require('util/WechatShare');
  var YiXinShare = require('util/YiXinShare');
  //var FacebookShare = require('util/FacebookShare');

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
      //fix chrome for android active effect remain issue
      $.os.android && /Chrome/i.test(window.navigator.userAgent) && els.body.on('touchstart','* [data-fix-active]',function(e){
        e.preventDefault();
      });
      els.body.on(VIEW.tapEvent,'* [data-fake-link]',function(){
        Core.Event.trigger('redirect',this.getAttribute('data-fake-link'));
      });
      els.body.on(VIEW.tapEvent,'* [data-analytics]',function(){
        Core.Event.trigger('analyticsCurView',this.getAttribute('data-analytics'));
      });
      els.body.on(VIEW.tapEvent,'* [data-eventname]',function(){
        var ename = this.getAttribute('data-eventname'),
          eparam = this.getAttribute('data-eventparam')||'',
          eparams = this.getAttribute('data-eventparams')||'';

        if(ename){
          var params = [];
          params.push(ename);
          if(eparams){
            Array.prototype.push.apply(params,eparams.split(','));
          }else if(eparam){
            params.push(eparam);
          }
          Core.Event.trigger.apply(null,params);
        }
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
     *
     * option = {
             title String 'share title',
             text String 'share text',
             summary String 'share summary',
             imageurl String 'share image url',
             thumburl String 'share image thumb url',
             link String 'share link'
             }
     */
    this.renderShare = function(option){
      option = option || {};
      option.link = option.link || window.location.href;
      option.title = option.title || document.title;
      option.summary = option.summary || option.title;
      option.text = option.text || option.summary;
      option.thumburl = option.thumburl || Actions.dejaShareLogo;
      option.imageurl = option.imageurl || option.thumburl;


      Core.NativeBridge.set_data_for_share(option);

      updateWechatShareMeta(option.title,option.summary,option.thumburl || option.imageurl);
      updateYiXinShareMeta(option.summary,option.thumburl || option.imageurl);
      //updateFacebookShareMeta(option.link,option.title,option.text, option.imageurl);
      return this;
    }

    function updateWechatShareMeta(title,content,link,img){
      WechatShare({
        "appid": "",
        "img_url": img || Actions.dejaShareLogo,
        "img_width": "200",
        "img_height": "200",
        "link": link || window.location.href,
        "url": link || window.location.href,
        "desc": content || document.title,
        "content": content || document.title,
        "title": title || document.title
      });
    }
    function updateYiXinShareMeta(content,img){
      YiXinShare({
        content: content||document.title,
        img: img||Actions.dejaShareLogo
      });
    }
    //function updateFacebookShareMeta( url, title, description, image){
    //  FacebookShare({
    //    url: url,
    //    title: title,
    //    description: description,
    //    image: image ||Actions.dejaShareLogo
    //  });
    //}

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
