define(function (require, exports, module) {
  function formatMoney(num) {
    return (num).toFixed(2).replace(/./g, function (c, i, a) {
      return i && c !== "." && !((a.length - i) % 3) ? ',' + c : c;
    });
  }

  /**
   * count down and increase number
   * @param option = {
   *  el,dest,rate,duration
   * }
   */
  function countNum(option){
    option = option || {};
    if(!option.el){return ;}

    var total = option.dest || 0,
      rate = option.rate || 50,
      duration = option.duration || 1500,
      totalEl = option.el,
      curNum = parseInt(totalEl.innerHTML)||0,
      increase = Math.round(Math.abs(curNum-total)/(duration/rate))||1,
      countDown = curNum>total;
    function fn(){
      if( (!countDown && curNum>=total) || (countDown && curNum<=total) ){
        totalEl.innerHTML = total;
      }else{
        totalEl.innerHTML = curNum;
        curNum += countDown?(-increase):increase;
        setTimeout(fn,rate);
      }
    }
    fn();
  }

  return {
    formatMoney: formatMoney,
    countNum: countNum
  }
});
