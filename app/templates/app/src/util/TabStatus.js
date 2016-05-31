var store = {};

function init(){
  var data = {curIdx: 0};
  this.getStatus  = function () {
    return data;
  }
  this.setCurTabIdx = function (idx) {
    data.curIdx = idx;
  }
  this.getCurTabIdx = function () {
    return data.curIdx;
  }
  this.setTabPosition = function (idx) {
    idx = idx || this.getCurTabIdx() || 0;
    data[idx] = $(window).scrollTop();
  }
  this.getTabPosition = function(idx) {
    return data[idx] || 1;
  }
  this.scrollToTabPosition = function(idx, budget){
    window.scrollTo(0, Math.max(budget||1, this.getTabPosition(idx)))
  }
}
function TabStatus(key){
  store[key] = store[key] || new init();
  return store[key];
}

module.exports = TabStatus;
