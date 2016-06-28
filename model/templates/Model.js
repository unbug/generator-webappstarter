var RequestHelper = require('app/model/RequestHelper');
var StoreHelper = require('app/model/StoreHelper');
var Actions = require('app/resources/Actions');
var Basic = require('app/model/Model');

var <%=umodelName%>,
    Mdl = Core.Class.Model,
    lcStorage = Core.localStorage;

function <%=modelName%>(){

}

//demo sub model for get request
<%=modelName%>.prototype.testSubModelGetMethod = StoreHelper.requestStore(Actions.actionForTestSubModelGetMethod);

//demo sub model for post request
<%=modelName%>.prototype.testSubModelPostMethod = StoreHelper.postStore(Actions.actionForTestSubModelPostMethod);

//demo sub model for paging
<%=modelName%>.prototype.testSubModelPaging = StoreHelper.pagingStore(Actions.actionForTestSubModelPaging);

//demo sub model for JSONP
<%=modelName%>.prototype.testSubModelJSONP = StoreHelper.JSONPStore(Actions.actionForTestSubModelJSONP);


module.exports = new <%=modelName%>();
