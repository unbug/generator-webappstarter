define(function (require, exports, module) {
  var RequestHelper = require('app/model/RequestHelper');
  var Actions = require('app/resources/Actions');
  var Basic = require('app/model/Model');

  var <%=umodelName%>,
      Mdl = Core.Class.Model,
      lcStorage = Core.localStorage;

  function <%=modelName%>(){

  }

  //demo sub model for get request
  <%=modelName%>.prototype.testSubModelGR = new Mdl({
    request: function (data,callback) {
      RequestHelper.request(Actions.actionForTestSubModelGR,data,callback,this);
    }
  });

  //demo sub model for post request
  <%=modelName%>.prototype.testSubModelPR = new Mdl({
    post: function (data,callback) {
      RequestHelper.post(Actions.actionForTestSubModelPR,data,callback,this);
    }
  });

  //demo sub model for pages
  <%=modelName%>.prototype.testSubModelPG = new Mdl({
    page: 0,
    page_size: 20,
    resetPage: function(){
      this.page = 0;
    },
    request: function (data,callback) {
      var _this = this;
      data.page = this.page;
      data.page_size = this.page_size;
      RequestHelper.getJSON({
        data: data,
        action: Actions.actionForTestSubModelPG,
        complete: function (data) {
          if (data.success) {
            _this.set(data.data);
            _this.page++;
          }
          callback && callback(data.success);
        }
      });
    }
  });

  //demo sub model for JSONP
  <%=modelName%>.prototype.testSubModelJSONP = new Mdl({
    request: function () {
      RequestHelper.JSONP({
        action: Actions.actionForTestSubModelJ+'&callback=afterRequestTestSubModelJSONP'
      });
    }
  });
  window.afterRequestTestSubModelJSONP = function(data){
    <%=umodelName%>.testSubModelJSONP.set(data);
  }
  //end demo sub model for JSONP

  <%=umodelName%> = new <%=modelName%>;

  return <%=umodelName%>;
});
