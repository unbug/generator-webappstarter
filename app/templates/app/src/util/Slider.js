define(function (require, exports, module) {
  function Slider(option) {
    option = option || {};
    var me = this,
      emptyFn = function () {
      },
      el = option.el.find('.' + (option.listCls || 'list')),
      pEl = option.el.find('.' + (option.processCls || 'process')),
      isMoving = false,
      moveTimeout = option.moveTimeout || 100,
      moveDuration = option.moveDuration || 640,
      moveRate = option.moveRate || 1.3,
      index = 0,
      totalWidth = el.width(),
      itemLength = el.children().length,
      itemWidth = totalWidth / itemLength,
      orientation = true,
      lastMove = 0,
      autoTimer = 0;
    var enablePrecess = option.enablePrecess,
      enableAutorun = option.enableAutorun,
      enableDrag = option.enableDrag;
    var onMove = option.onMove || emptyFn,
      onFirst = option.onFirst || emptyFn,
      onLast = option.onLast || emptyFn,
      onTouchstart = option.onTouchstart || emptyFn,
      onTouchend = option.onTouchend || emptyFn,
      onTouchmove = option.onTouchmove || emptyFn;
    var bezier = 'cubic-bezier(0.075, 0.82, 0.165, 1)';//'cubic-bezier(0.1, 0.57, 0.1, 1)';
    var drag = {
      moved: false,
      timer: 0,
      dirX: 0,
      distX: 0,
      dirY: 0,
      distY: 0,
      moveDistX: 0,
      maxMove: itemWidth / 2,
      startTime: 0,
      endTime: 0,
      resetMaxMove: function () {
        drag.maxMove = itemWidth / 2;
      },
      reset: function () {
        drag.moved = false;
        drag.isSwipe = false;
        drag.dirX = 0;
        drag.distX = 0;
        drag.dirY = 0;
        drag.distY = 0;
        drag.timer = 0;
        drag.timer && cancelRequestAnimFrame(drag.timer);
      },
      move: function () {
        if (!drag.moved) {
          return;
        }
        var mX = -index * itemWidth,
          dx = Math.round(Math.abs(drag.distX) / moveRate);
        drag.moveDistX = dx;
        if (dx > itemWidth * 9 / 10) {
          drag.endDrag();
          return;
        } else if (drag.distX > 0) {
          mX += dx;
        } else {
          mX -= dx;
        }

        el.css({
          '-webkit-transform': 'translate3d(' + mX + 'px,0,0)',
          '-webkit-transition': '-webkit-transform 0ms ' + bezier
        });
        lastMove = -mX;
      },
      endDrag: function () {
        drag.moved = false;
        var mX = -index * itemWidth,
          dx = drag.moveDistX;
        if (drag.isSwipe) {
          drag.distX > 0 ? me.pre() : me.next();
        } else {
          if (drag.distX > 0) {
            mX += dx;
          } else {
            mX -= dx;
          }
          if (mX >= 0 || mX <= -(totalWidth - itemWidth) || dx < drag.maxMove) {
            move();
          } else {
            drag.distX > 0 ? me.pre() : me.next();
          }
        }

        drag.reset();
        me.startAutoRun();
      }
    };

    function touchStart(e) {
      if (itemLength < 2 || isMoving) {
        return;
      }
      drag.startTime = new Date().getTime();
      onTouchstart();
      autoTimer && clearInterval(autoTimer);
      totalWidth = totalWidth || el.width();
      itemWidth = itemWidth || (totalWidth / itemLength);
      drag.resetMaxMove();
      var touch = e.touches[0];
      drag.moved = true;
      drag.dirX = touch.pageX;
      drag.distX = 0;
      drag.dirY = touch.pageY;
      drag.distY = 0;
      (function animloop() {
        if (!drag.moved) {
          drag.reset();
          return;
        }
        drag.move();
        drag.timer = requestAnimFrame(animloop);
      })();
    }

    function touchMove(e) {
      var touch = e.touches[0];
      drag.distX = touch.pageX - drag.dirX;
      drag.distY = touch.pageY - drag.dirY;
      onTouchmove(Math.abs(drag.distX), Math.abs(drag.distY));
    }

    function touchEnd(e) {
      drag.endTime = new Date().getTime();
      if (drag.moved) {
        drag.isSwipe = drag.endTime - drag.startTime <= 200 && Math.abs(drag.distX) > 30;
        drag.endDrag();
      }
      onTouchend(Math.abs(drag.distX), Math.abs(drag.distY));
    }

    if (enableDrag) {
      el.touchstart = el.touchstart || touchStart;
      el.touchmove = el.touchmove || touchMove;
      el.touchend = el.touchend || touchEnd;
      el.off('touchstart', el.touchstart);
      el.off('touchmove', el.touchmove);
      el.off('touchend', el.touchend);
      el.on('touchstart', el.touchstart);
      el.on('touchmove', el.touchmove);
      el.on('touchend', el.touchend);
    }
    this.next = function () {
      if (isMoving) {
        return;
      }
      index++;
      move();
    }
    this.pre = function () {
      if (isMoving) {
        return;
      }
      index--;
      move();
    }
    function move() {
      if (isMoving) {
        return;
      }
      isMoving = true;
      setTimeout(function () {
        isMoving = false;
      }, moveTimeout);
      itemLength = el.children().length;
      if (index > itemLength - 1) {
        index = itemLength - 1;
        onLast(index);
      } else if (index < 0) {
        index = 0;
        onFirst(index);
      }
      var _m = index * itemWidth,
        _absm = Math.abs(lastMove - _m),
        _t = (moveDuration / itemWidth) * _absm,
        animate = 'ease';

      if (drag.isSwipe) {
        var velocity = drag.moveDistX * moveRate / (drag.endTime - drag.startTime);
        _t = velocity * _absm;
        animate = bezier;
      }

      lastMove = _m;
      //修正android差1px的问题
      //_m = (_m>0&&$.os.android)?(_m+1):_m;
      el.css({
        '-webkit-transform': 'translate3d(-' + _m + 'px,0,0)',
        '-webkit-transition': '-webkit-transform ' + _t + 'ms ' + animate
      });
      runProcess();
      onMove(index);
    }

    this.reset = function () {
      index = 0;
      orientation = true;
      totalWidth = totalWidth || el.width();
      itemLength = el.children().length;
      itemWidth = itemWidth || (totalWidth / itemLength);
      me.stopAutoRun();
      el.css({'-webkit-transform': 'translate3d(0,0,0)'});
      lastMove = 0;
      drag.reset();
      pEl.hide();
      renderProcess();
      me.startAutoRun();
    }
    this.stopAutoRun = function () {
      autoTimer && clearInterval(autoTimer);
    }
    function moveOrientation() {
      totalWidth = totalWidth || el.width();
      itemLength = el.children().length;
      itemWidth = itemWidth || (totalWidth / itemLength);
      if (index == itemLength - 1) {
        orientation = false;
      } else if (index == 0) {
        orientation = true;
      }
      if (!orientation) {
        me.pre();
      } else {
        me.next();
      }
    }

    this.startAutoRun = function () {
      if (enableAutorun && itemLength > 1) {
        autoTimer = setInterval(function () {
          if (drag.moved) {
            return;
          }//如果拖动就停止
          moveOrientation();
        }, 3000);
      }
    }
    function renderProcess() {
      if (enablePrecess && itemLength > 1) {
        var tmp = [];
        for (var i = 0; i < itemLength; i++) {
          tmp.push('<div></div>');
        }
        pEl.html(tmp.join(''));
        pEl.show();
        runProcess();
      }
    }

    function runProcess() {
      if (!enablePrecess) {
        return;
      }
      var processChild = pEl.find('div');
      processChild.removeClass('on');
      $(processChild[index]).addClass('on');
    }

    this.reset();
  }

  return Slider;
});
