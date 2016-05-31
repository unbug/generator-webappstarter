var RequestHelper = require('app/model/RequestHelper');

function pagingStore(action, options) {
  var option = {
    isFromStore: false,
    page: 0,
    page_size: 20,
    setWithStoreData: function (data) {
      this.resetPage(data.__page);
      this.set(data, data.__STORE_ID);
    },
    resetPage: function (storePage) {
      if (storePage == undefined || storePage == null) {
        this.isFromStore = false;
        this.page = 0;
      }
      //reset page by history
      else {
        this.isFromStore = true;
        this.page = storePage + 1;
      }
    },
    request: function (data, callback) {
      this.isFromStore = false;
      data = data || {};
      var _this = this;
      var __STORE_ID;
      __STORE_ID = data.__STORE_ID;
      delete data.__STORE_ID;
      data.page = this.page;
      data.page_size = this.page_size;
      RequestHelper.getJSON({
        data: data,
        action: action,
        complete: function (data) {
          if (data.success) {
            _this.set(function (storeData) {
              //store data by customs
              if (storeData) {
                storeData.__page = _this.page;
                storeData.end = data.data.end;
                storeData.data = storeData.data.concat(data.data.data);
              } else {
                storeData = data.data;
                storeData.__page = _this.page;
              }
              return storeData;
            }, __STORE_ID);
            _this.page++;
          }
          callback && callback(data.success);
        }
      });
    }
  };
  Core.Class.apply(option, options);
  return new Core.Class.Model(option);
}

function requestStore(action, options) {
  var option = {
    request: function (data,callback) {
      RequestHelper.request(action,data,callback,this);
    }
  };

  Core.Class.apply(option, options);
  return new Core.Class.Model(option);
}

function postStore(action, options) {
  var option = {
    post: function (data,callback) {
      RequestHelper.post(action,data,callback,this);
    }
  };

  Core.Class.apply(option, options);
  return new Core.Class.Model(option);
}

module.exports = {
  pagingStore: pagingStore,
  requestStore: requestStore,
  postStore: postStore
};
