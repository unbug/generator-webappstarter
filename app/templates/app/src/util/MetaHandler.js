define(function(require, exports, module) {

  var ua = navigator.userAgent,
    android = ua.match(/(Android);?[\s\/]+([\d.]+)?/),
    ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
    ipod = ua.match(/(iPod)(.*OS\s([\d_]+))?/),
    iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
    os = {};

  if (android) os.android = true, os.version = android[2];
  if (iphone && !ipod) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.')
  if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.')
  if (ipod) os.ios = os.ipod = true, os.version = ipod[3] ? ipod[3].replace(/_/g, '.') : null;

  var MetaHandler = function(){
    //MONOSTATE
    if(MetaHandler.prototype.instance){
      return MetaHandler.prototype.instance;
    }
    var me = this;
    var meta = {},_els;

    /**
     * _els
     * meta = {name:{content:String,seriation:Array,store:{property:String},...},...}
     * @method init
     */
    function init(){
      _els = document.getElementsByTagName('meta');
      for(var i=0;i<_els.length;i++){
        var name = _els[i].name;
        if(name){
          meta[name] = {};
          meta[name].el = _els[i];
          meta[name].content = _els[i].content;
          meta[name].seriation = meta[name].content.split(',');
          meta[name].store = getContentStore(name);
        }
      }
      return me;
    }
    function getContentStore(name){
      var content = meta[name].seriation,store = {};
      for(var i=0;i<content.length;i++){
        if(content[i].length<1){
          content[i] = null;
          delete content[i];
          content.length--;
        }else{
          var ct = content[i].split('='),
            pp = ct[0];
          if(pp){
            store[pp] = ct[1];
          }
        }
      }
      return store;
    }
    this.hasMeta = function(name){
      return meta[name]?1:0;
    }
    this.createMeta = function(name){
      if(!this.hasMeta(name)){
        var el = document.createElement('meta');
        el.name = name;
        document.head.appendChild(el);
        meta[name] = {};
        meta[name].el = el;
        meta[name].content = '';
        meta[name].seriation = [];
        meta[name].store = {};
      }
      return me;
    }
    this.setContent = function(name,value){
      meta[name].content = value;
      meta[name].el.content = value;
      return me;
    }
    this.getContent = function(name){
      return meta[name] && meta[name].content;
    }
    function updateContent(name){
      meta[name].content = meta[name].seriation.join(',');
      me.setContent(name,meta[name].content);
      return me;
    }
    this.removeContentProperty = function(name,property){
      var _property = property;
      if(meta[name]){
        if(meta[name].store[_property]!=null){
          for(var i = 0;i<meta[name].seriation.length;i++){
            if(meta[name].seriation[i].indexOf(property+'=')!=-1){
              meta[name].seriation[i] = null;
              delete meta[name].seriation[i];
              break;
            }
          }
        }
        updateContent(name);
      }
      return me;
    }
    this.getContentProperty = function(name,property){
      return meta[name] && meta[name].store[property];
    }
    this.setContentProperty = function(name,property,value){
      var _property = property,
        pv = property+'='+value;
      if(meta[name]){
        if(meta[name].store[_property]!=null){
          meta[name].store[_property] = value;
          for(var i = 0;i<meta[name].seriation.length;i++){
            if(meta[name].seriation[i].indexOf(property+'=')!=-1){
              meta[name].seriation[i] = pv;
              break;
            }
          }
        }else{
          meta[name].store[_property] = value;
          meta[name].seriation.push(pv);
        }
        updateContent(name);
      }
      return me;
    }

    /**
     * Automatically adjusts according to a device’s screen size.
     * Base on [theory](https://www.icloud.com/keynote/AwBWCAESEJd5uucfBPGt6KPotb3tNfsaKm-Q7fqs2-4ojmPoPJuWZCvjYgKl5jEf1URdRgdgNHe38BTzeF3DK7q1ewMCUCAQEEIJ85mw21ii_AwybOqxoF-V02v51Vdg855ED4qVA_8bXr)
     *
     * Note:
     *  For iOS it just works perfectly,if it's not,try to use "webView.scalesPageToFit = YES" in the webview.
     *  For android it works in all of build-in broswers,it might be break in some third-part ROM's build-in broswers(webview).
     *  That's because they don't do a good job for the webview,such as they should not use "webview.setBuiltInZoomControls(false)".
     *
     *  This is a painless solution.For more extra work,checkout the [REM solution](http://gregrickaby.com/using-the-golden-ratio-and-rems/).
     *
     * e.g.
     *     <head>
     *      ....
     *      <!-- defind the viewport meta -->
     *      <meta content="target-densitydpi=device-dpi,width=640" name="viewport">
     *      <!-- set the body's width to be the same as the viewport's width -->
     *      <style type="text/css">
     *           body{width: 640px;}
     *      </style>
     *      <!-- magic happens here -->
     *      <script> (new MetaHandler()).fixViewportWidth(); </script>
     *     </head>
     *
     * Demo:
     * [NetEase newsapp member club](http://c.3g.163.com/CreditMarket/default.html)
     * [Deja Fashion topic](http://m.deja.me/topics/#/special/9)
     *
     * @param width {number} the size of the viewport
     * @param fixBody {boolean} force to set body's width as same as the size of the viewport
     */
    this.fixViewportWidth = function(width,fixBody){
      width = width || me.getContentProperty('viewport','width');
      if(width != 'device-width'){
        var iw = window.innerWidth || width,
          ow = window.outerWidth || iw,
          sw = window.screen.width || iw,
          saw = window.screen.availWidth || iw,
          ih = window.innerHeight || width,
          oh = window.outerHeight || ih,
          sh = window.screen.height || ih,
          sah = window.screen.availHeight || ih,
          w = Math.min(iw,ow,sw,saw,ih,oh,sh,sah),
          ratio = w/width,
          dpr = window.devicePixelRatio;
        ratio = Math.min(ratio,dpr);

        //fixBody may trigger a reflow,you should not use it if you could do it in your css
        if(fixBody){
          document.body.style.width = width+'px';
        }

        if(os.android){
          me.removeContentProperty('viewport','user-scalable')
            .setContentProperty('viewport','target-densitydpi','device-dpi')
            .setContentProperty('viewport','initial-scale',ratio)
            .setContentProperty('viewport','maximum-scale',ratio);
        }else if(os.ios && !os.android){
          me.setContentProperty('viewport','user-scalable','no');
          if(os.ios && parseInt(os.version)<7){
            me.setContentProperty('viewport','initial-scale',ratio);
          }
        }
      }
    }
    init();
    //MONOSTATE
    MetaHandler.prototype.instance = this;
  };

  return new MetaHandler;
});
