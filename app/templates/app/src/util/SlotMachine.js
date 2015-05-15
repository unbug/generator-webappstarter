define(function (require, exports, module) {
  function SlotMachine(option) {
    option = option || {};
    var me = this,
      emptyFn = function () {
      },
      lightEl = option.lightEl,
      sliderA = option.sliderA,
      sliderB = option.sliderB,
      sliderC = option.sliderC,
      sliderList = option.sliderList,
      slotUI = option.slotUI,
      GlobalTouch = option.GlobalTouch,
      sliderTpl = option.sliderTpl,
      lightTimer = 0,
      lightUpeateTime = 0,
      lightStoped = true,
      lightDuration = 350,
      dataLen = 0,
      listHeight = 0,
      twoSameCount = 0,//失败时两个同时出现计数
      moveLen = {},
      winIndex = 0,
      itemIndex = 0,
      data;


    var listLen = option.listLen || 15,//默认组数，全部奖品为一组,一共20组
      wrapHeight = option.wrapHeight || 200,//可视区高度
      itemHeight = option.itemHeight || 83,//项高度
      extraMove = option.extraMove || 30,//额外移动距离，用于调整居中奖品
      moveDuration = option.moveDuration || 2.0,//移动 毫秒每像素
      minMove = option.minMove || 10;//最小滚动15组

    var onPlay = option.onPlay || emptyFn,
      onEndPlay = option.onEndPlay || emptyFn,
      onReset = option.onReset || emptyFn,
      onLighting = option.onLighting || emptyFn;

    this.locked = false;

    this.play = function (index) {
      if (me.locked) {
        return;
      }
      onPlay();
      itemIndex = index;
      var sfn = slideLose;
      if (itemIndex != null) {
        sfn = slideWin;
      } else {
        itemIndex = randomIndex(0, dataLen - 1);
      }
      setTimeout(function () {
        sfn();
      }, 1200);
      slotUI.currentScrollData = data[itemIndex];

      me.locked = true;
    }
    function computeMoveA() {
      winIndex = randomIndex(3, listLen - 1);
      while (winIndex >= (listLen - minMove)) {
        winIndex = randomIndex(3, listLen - 1);
      }
      moveLen.A = ( winIndex * dataLen + (itemIndex) ) * itemHeight - extraMove * 2;
    }

    function slideWin() {
      computeMoveA();
      moveLen.B = moveLen.A + ( randomBool() ? (dataLen * itemHeight) : ( randomBool() ? (-dataLen * itemHeight) : 0 ) );
      moveLen.C = moveLen.A + ( randomBool() ? (dataLen * itemHeight) : ( randomBool() ? (-dataLen * itemHeight) : 0 ) );
      twoSameCount++;

      startMove();
    }

    function slideLose() {
      computeMoveA();
      var _list = ['B', 'C'],
        rs = [];
      rs = _list.sort(function () {
        return randomBool();
      });

      var tmpSame = randomBool(),
        tmpIndex = randomIndex(0, dataLen - 1),
        loseIndex = itemIndex;
      while (loseIndex == itemIndex) {//最后一个不会跟第一个相同
        loseIndex = randomIndex(0, dataLen - 1);
      }
      if (tmpIndex != loseIndex && twoSameCount < (dataLen / 2) && !tmpSame && tmpIndex != itemIndex) {//至少出现2个相同dataLen/2次才考虑出现三个不同
        loseIndex = tmpIndex;
      }
      moveLen[rs[0]] = tmpSame
        ? moveLen.A + ( randomBool() ? (dataLen * itemHeight) : (-dataLen * itemHeight) )
        : ( ( winIndex * dataLen + ( tmpIndex + ( randomBool() ? dataLen : 0) ) ) * itemHeight - extraMove * 2 );
      moveLen[rs[1]] = ( winIndex * dataLen + ( loseIndex + ( randomBool() ? dataLen : 0) ) ) * itemHeight - extraMove * 2;
      if (tmpSame || itemIndex == tmpIndex) {
        twoSameCount++;
        slotUI.currentScrollData = data[itemIndex];
      } else if (tmpIndex == loseIndex) {
        twoSameCount++;
        slotUI.currentScrollData = data[loseIndex];
      } else {
        twoSameCount = 0;
        slotUI.currentScrollData = null;
      }

      startMove();
    }

    function startMove() {
      var _list = [
          {el: sliderB, move: moveLen.B, time: moveDuration * moveLen.B},
          {el: sliderC, move: moveLen.C, time: moveDuration * moveLen.C},
        ],
        rs = [];
      rs = _list.sort(function () {
        return randomBool();
      });

      moveTo({el: sliderA, move: moveLen.A, time: moveDuration * moveLen.A});
      setTimeout(function () {
        moveTo(rs[0]);
      }, 500);
      setTimeout(function () {
        moveTo(rs[1]);
      }, 900);

      startLight();
    }

    this.renderList = function () {
      me.hide();
      data = slotUI.slotChildData;
      dataLen = data.length;
      if (dataLen > 4 && 10 > dataLen - 4) {
        listLen = 15 - (dataLen - 4);
        minMove = 10 - (dataLen - 4);
      }

      var sList = [],
        finalList = [],
        finalHTML,
        total = parseInt(listLen);

      for (var i = 0; i < dataLen; i++) {
        sList.push(sliderTpl({IMG: data[i].image}));
      }
      while (total) {
        finalList.push('<div class="slider-group">');
        finalList.push(sList.join(''));
        finalList.push('</div>');
        total--;
      }
      finalHTML = finalList.join('');
      sliderA.html(finalHTML);
      sliderB.html(finalHTML);
      sliderC.html(finalHTML);
      me.reset();
      me.show();
    }
    function moveTo(option) {
      //http://stackoverflow.com/questions/7466070/how-can-i-achieve-a-slot-machine-spinning-effect-with-css3-jquery?rq=1
      option.el.css({
        '-webkit-transform': 'translate3D(0px,' + -option.move + 'px,0px)',
        '-webkit-transition': '-webkit-transform ' + option.time + 'ms ease-in-out'
      });
    }

    this.reset = function () {
      GlobalTouch.preventMove = false;
      stopLight();
      me.locked = false;
      listHeight = itemHeight * dataLen * listLen;
      var move = listHeight - (wrapHeight + itemHeight - extraMove * 2);
      moveTo({el: sliderA, move: move, time: 0});
      moveTo({el: sliderB, move: move, time: 0});
      moveTo({el: sliderC, move: move, time: 0});
      sliderList.removeClass('fadein');
      setTimeout(function () {
        sliderList.addClass('fadein');
      }, 0);
      onReset();
    }
    this.show = function () {
      sliderList.show();
    }
    this.hide = function () {
      sliderList.hide();
    }
    function startLight() {
      lightDuration = 200;
      me.doLight();
      var lastTime = ( Math.max(Math.max(moveLen.A, moveLen.B + 900), moveLen.C + 500) ) * moveDuration;
      secTime = ( Math.min(Math.min(moveLen.A, moveLen.B + 900), moveLen.C + 500) ) * moveDuration;
      setTimeout(function () {
        lightDuration = 600;
      }, secTime);
      setTimeout(function () {
        stopLight();
        onEndPlay();
      }, lastTime - 800);
    }

    function stopLight() {
      lightStoped = true;
      GlobalTouch.preventMove = false;
      lightUpeateTime = 0;
      setTimeout(function () {
        lightDuration = 350;
        lightEl.removeClass('off on');
      }, 600);
    }

    function animateLight() {
      var _nd = new Date().getTime();
      if (_nd - lightUpeateTime >= lightDuration) {
        lightUpeateTime = _nd;
        if (lightEl.hasClass('on')) {
          lightEl.removeClass('on').addClass('off');
        } else if (lightEl.hasClass('off')) {
          lightEl.removeClass('off').addClass('on');
        } else {
          lightEl.addClass('on');
        }
      }
    }

    this.doLight = function () {
      window.scrollTo(0, 1);
      lightStoped = false;
      GlobalTouch.preventMove = true;
      (function animloop() {
        if (lightStoped) {
          lightTimer && cancelRequestAnimFrame(lightTimer);
          lightUpeateTime = 0;
          return;
        }
        lightTimer = requestAnimFrame(animloop);
        animateLight();
      })();
      onLighting();
    }

    function randomIndex(from, to) {
      from = from || 0;
      to = to || 0;
      return Math.floor(Math.random() * (to - from + 1) + from);
    }

    function randomBool() {
      return (0.5 > Math.random());
    }
  }//end SlotMachine
  return SlotMachine;
});
