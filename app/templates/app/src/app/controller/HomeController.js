define(function(require, exports, module) {
    var Actions = require('../resources/Actions');
    var BaseModel = require('app/model/Model');
    var BaseView = require('app/view/View');
    var HomeView = require('app/view/HomeView');

    function HomeController(){
        this.models = {
            Base: BaseModel
        }
        this.views = {
            Base: BaseView,
            Home: HomeView
        };

        var CTRL = this,
            viewNames,
            curViewId = '';

        viewNames = {
            'home': 'Home'
        }
        Core.Router.onChanged(onViewChanged)
            .onUnsubscribed(onViewUnnamed)
            .subscribe('/home/',onViewHome);

        //统计视图
        Core.Event.on('analyticsCurView',analyticsCurView);
        //forwardHome
        Core.Event.on('forwardHome',forwardHome);

        function onViewChanged(){
            if(!Core.Router.currentMatch('/home/')){
                CTRL.views.Home.hide();
            }
        }

        function onViewUnnamed(hash){
            onViewHome();
            Core.Event.trigger( 'analytics');
        }
        function onViewHome(){
            curViewId = 'home';
            CTRL.views.Home.show();

            //追加统计
            analyticsCurView();
        }
        function forwardHome(arg){
            Core.Router.forward('/home/'+(arg||''));
        }
        function analyticsCurView(params,title){
            if( !Core.Router.currentMatch(['/home/']) ){
                return;
            }
            params = params?('&'+params):'';
            title = title||viewNames[curViewId]||document.title;
            
            Core.Event.trigger( 'analytics','viewid='+curViewId+params,title );
        }
    }
    return new HomeController;
});