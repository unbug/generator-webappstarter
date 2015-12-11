define(function (require, exports, module) {
  var Actions = require('app/resources/Actions');
  var ThirdVendor = require('util/ThirdVendor');
  var BasicModel = require('app/model/Model');
  var BasicView = require('app/view/View');

  function Controller() {
    this.models = {
      Basic: BasicModel
    };
    this.views = {
      Basic: BasicView
    };
    //所有视图初始化前，需要获得客户端的用户登录信息
    //Core.Router.onReady(onUserinfo);

    Core.Router.onChanged(onViewChanged);

    var CTRL = this,
      isApp = Core.NativeBridge.isApp(),
      params = Core.localParam(),
      _userid = params.search['userid'];
    ///*Todo: debug user
    _userid && CTRL.models.Basic.setUserId(_userid);
    //*/

    //更新数据缓存时间
    Core.Event.on('resetModelUpdateTimeout', CTRL.models.Basic.modelUpdate.timer.resetAll);
    //通过API名称，调用客户API
    Core.Event.on('appAPI', appAPI);
    //分享
    Core.Event.on('share', appShare);
    //去下载
    Core.Event.on('appDownload', redirectToDownload);
    //去更新
    Core.Event.on('appUpdate', appUpdate);
    //去deja.me
    Core.Event.on('redirectToDejame', redirectToDejame);
    //跳转出商城
    Core.Event.on('redirect', redirectToPage);
    //去登录
    Core.Event.on('login', onLogin);
    //去WEB登录
    Core.Event.on('webLogin', webLogin);
    //去App登录
    Core.Event.on('appLogin', appLogin);
    //从App获取用户信息
    Core.Event.on('appUserinfo', onUserinfo);
    //去反馈
    Core.Event.on('feedback', onFeedback);
    //复制文本
    Core.Event.on('appCopyText', appCopyText);
    //更新标题
    Core.Event.on('appModifyTitle', appModifyTitle);
    //修改右上角功能菜单
    Core.Event.on('appActionbutton', appActionButton);
    //修改右上角功能菜单成默认
    Core.Event.on('appActionDefaultButton', appActionDefaultButton);
    //修改右上角功能菜单成分享
    Core.Event.on('appActionShareButton', appActionShareButton);
    //注册webview关闭事件
    Core.Event.on('appOnUnload', appOnUnload);
    //关闭webview
    Core.Event.on('appCloseWebView', appCloseWebView);
    //Update Profile
    Core.Event.on('appUpdateProfile', appUpdateProfile);
    //tab 切换
    Core.Event.on('switchTab', switchTab);
    //触发暂时性动画
    Core.Event.on('trigerAnimate', trigerAnimate);
    //text 收展
    Core.Event.on('toggleTextSectionExpand', toggleTextSectionExpand);
    //统计
    Core.Event.on('analytics', analytics);

    //滚动到顶部
    Core.Event.on('scrollTop', scrollTop);
    //back
    Core.Event.on('back', function (action) {
      Core.Router.back(action || -1);
    });
    function analytics(params, title) {
      setTimeout(function () {
        var url = Actions.analytics + '?devevent=1' + (params ? ('&' + params) : '');
        //android和iOS
        if ($.os.ios && !$.os.android) {
          url += '&ios';
        } else if ($.os.android) {
          url += '&android';
        }
        if (ThirdVendor) {
          url += '&plf=' + ThirdVendor.code;
        }
        if(CTRL.models.Basic.isLogined()){
          url += '&logined';
        }
        url += '&t='+(new Date().getTime());

        Core.Navigator.protocol(url, true);
      }, 0);
    }

    function scrollTop() {
      var top = Math.min(Math.min(window.pageYOffset, document.documentElement.scrollTop || document.body.scrollTop), window.scrollY),
        start = top,
        to = 0,
        timer = 0,
        change = to - start,
        currentTime = 0,
        increment = 20,
        duration = 500;
      (function animloop() {
        // increment the time
        currentTime += increment;
        if (start < 2 || CTRL.views.Basic.GlobalTouch.touched || currentTime > duration) {
          if (start < 2) {
            window.scrollTo(0, 1);
          }
          cancelRequestAnimFrame(timer);
          return;
        }
        window.scrollTo(0, Math.easeInOutQuad(currentTime, start, change, duration));
        timer = requestAnimFrame(animloop);
      })();
    }

    function onViewChanged() {
      appModifyTitle();
      CTRL.views.Basic.msgbox.hideLoading();
    }

    function onUserinfo() {
      if (isApp) {
        Core.NativeBridge.userInfo(null, function (rs) {
          CTRL.models.Basic.setAppUserMeta(rs);
          if (rs && !!rs.userid) {
            if (CTRL.models.Basic.verifyLoginCookie() && CTRL.models.Basic.verifyLoginCookieTimeout(30)) {
              Core.Router.run();
            } else {
              onLogin();
            }
          } else {
            Core.Router.run();
          }
        });
        //Core.NativeBridge.device(function(rs){
        //    if(rs){
        //        CTRL.models.Basic.setNativeBridgeDeviceMeta(rs);
        //    }
        //});
      } else {
        Core.Router.run();
      }
    }

    function onLogin(arg,msg,callback) {
      if (isApp) {
        appLogin(callback);
      } else {
        CTRL.views.Basic.msgbox.showSignin({
          msg: msg,
          yesCallback: function (plf) {
            webLogin( Actions.main + (arg || ''), null, plf );
          }
        });
        //CTRL.views.Basic.msgbox.showDownload({
        //  yesCallback: function () {
        //    redirectToDownload(Actions.main + (arg || ''));
        //  }
        //});
      }
    }

    function onFeedback(email) {
      Core.Navigator.protocol('mailto:'+(email||'mozat@mozat.com?subject=Suggestion'), true);
    }

    function switchTab(el, tabs, tabContents) {
      if (!tabs || !tabContents) {
        return;
      }
      var isClicked = !!el;
      el = el || tabs[0];
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i] == el) {
          tabs[i].classList.add('on');
          trigerAnimate(tabContents.eq(i));
          tabContents[i] && tabContents[i].classList.add('show');
          isClicked && Core.Event.trigger('analyticsCurView', 'tab=' + i);
        } else {
          tabs[i].classList.remove('on');
          tabContents[i] && tabContents[i].classList.remove('show');
        }
      }
      Core.Event.trigger('analyticsCurView');
    }

    function trigerAnimate(el, classname, timeout) {
      if (!el) {
        return;
      }
      classname = classname || 'animated';
      timeout = timeout || 1200;
      el.animTimer && clearTimeout(el.animTimer);
      el.addClass(classname);
      el.animTimer = setTimeout(function () {
        el.removeClass(classname);
      }, timeout);
    }

    function toggleTextSectionExpand(el) {
      el && el.classList.toggle('expand');
    }

    function webLogin(surl, furl, pf) {
      var murl = window.location.href;
      surl = surl || murl;
      furl = furl || murl;
      pf = pf || 'fb';

      redirectToPage(Actions.login
        .replace('{SURL}', encodeURIComponent(surl))
        .replace('{FURL}', encodeURIComponent(furl))
        .replace('{PF}', pf));
    }

    function appLogin(callback){
      Core.NativeBridge.login(null, function (rs) {
        if (rs) {
          CTRL.models.Basic.saveLoginCookieTimeout();
          CTRL.models.Basic.modelUpdate.timer.resetAll();
          CTRL.models.Basic.setAppUserMeta(rs);
          if(callback){
            callback();
          }else{
            Core.Router.run();
          }
        }
      });
    }

    function appUpdate(msg,force) {
      redirectToApp(function () {
        CTRL.views.Basic.msgbox.showDialog({
          msg: msg || 'Please up to date your App',
          noText: force?null:'Close',
          yesText: 'Update',
          yesCallback: function () {
            downloadDejaInApp();
          }
        });
      });
    }

    function appShare(callback, plf) {
      redirectToApp(function () {
        var fn = Core.NativeBridge['share' + (plf ? ('_' + plf) : '')];
        fn && fn(null, callback);
      });
    }

    function appCopyText(text) {
      if (isApp) {
        Core.NativeBridge.copy(text);
      }
    }

    function appModifyTitle(title) {
      title = title || document.title;
      document.title = title;
      if (isApp) {
        Core.NativeBridge.modifytitle(title);
      }
    }

    function appActionButton(name, callback) {
      if (isApp) {
        Core.NativeBridge.updateBarButton(name, callback);
      }
    }

    function appActionShareButton() {
      appActionButton('share');
    }

    function appActionDefaultButton() {
      appActionButton('', function () {
      });
    }
    function appOnUnload(callback){
      if (isApp) {
        Core.NativeBridge.set_before_for_unload(callback);
      }
    }
    function appCloseWebView(){
      if (isApp) {
        Core.NativeBridge.closeweb();
      }
    }

    /**
     * @param subProtocol String creationLike,creationDelete,productLike,follow
     */
    function appUpdateProfile(subProtocol){
      appAPI('updateProfile',null,null,subProtocol);
    }

    /**
     * dejafashion://name/subProtocol
     * window.__dejafashion_data_name = data;
     * window.__dejafashion_after_name = callback;
     */
    function appAPI(name, data, callback, subProtocol,redirect){
      if (isApp) {
        Core.NativeBridge.trigger.apply(null,arguments);
      }else if(redirect){
        var proto = [name];
        subProtocol && proto.push(subProtocol);
        redirectToDownload(null,true,Actions.dejafashionSchema+proto.join('/'));
      }
    }
    function downloadDejaInApp() {
      var url = Actions.dejaAppAndroid;
      if ($.os.ios && !$.os.android) {
        url = Actions.dejaAppIos;
      }
      window.location = url;
    }

    function redirectToDejame() {
      redirectToPage(Actions.dejame);
    }

    //打开客户端原生视图
    function redirectToApp(callback, link) {
      if (isApp) {
        callback && callback();
      } else {
        CTRL.views.Basic.msgbox.showDownload({
          yesCallback: function () {
            redirectToDownload(link || window.location.href);
          }
        });
      }
    }

    /**
     * open a web site in app,or just op
     * @param link
     * @param autoopen
     * @param schema
     */
    function redirectToDownload(link, autoopen, schema) {
      link = !!link && link!='0'? ('#url=dejafashion://web/' + link) : '';
      link = !!schema?('#url='+schema): link;
      redirectToPage(Actions.dejaDwonloadBridge + (autoopen ? '?autoopen=1' : '') + link);
    }

    function redirectToPage(link) {
      if (link) {
        !(/__NativeBridge_target/g.test(link)) && appActionDefaultButton();
        window.location = link;
      }
    }

  }//end Controller
  return new Controller;
});
