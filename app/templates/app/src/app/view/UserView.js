define(function(require, exports, module) {
    var Templates = require('app/resources/Templates');
    var BaseView = require('app/view/View');
    var BaseModel = require('app/model/Model');


    function UserView(owner){
        this.models = {
            Base: BaseModel
        }
        this.viewCls = 'view-user';
        this._owner = owner;

        var VIEW = this,
            isApp = Core.NativeBridge.isApp(),
            Tpl,els,
            tap = VIEW._owner.tapEvent;

        //注册model观察者
        VIEW.models.Base.user.updated(render);

        function initEls(){
            if(els){return;}
            var main = $('.view-user');
            els = {
                //body: $('body'),
                main: main,

                list: main.find('.list'),
                back: main.find('.back')
            }
            bindEvent();
        }//end initEls       
        function initResources(){
            Tpl = new Templates.User;
            initEls();
        }
        this.getEls = function(){
            return els;
        }
        function bindEvent(){
            els.back.on(tap,Core.Router.back);
        }//end bindEvent        

        this.show = function(){
            initResources();

            VIEW._owner.show(VIEW.viewCls);
        }
        this.hide = function(){
            if(!els){ return;}
        }
        function render(data){
            initResources();

            data = data || VIEW.models.Base.user.get();

            if(!data || !data.length){return;}

            var list = [];
            data.forEach(function(key,index){
                list.push( Tpl.list.item(key) );
            });
            els.list.html( list.join('') );
            list = null;
        }//end render


    }//end View
    return new UserView(BaseView);
});
