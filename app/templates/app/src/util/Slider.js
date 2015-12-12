define(function (require, exports, module) {
  /**
   *
   * @param option
   * {
   * el, //list wrap element,optional if listEl is specified
   * listEl,// list element,optional if el is specified
   * processEl,//process element,optional if el is specified
   * listCls, //[optional]css class to find the slide list,default ".list"
   * processCls, //[optional]css class to find the slide process,default ".process"
   *
   * vertical, //[optional]slide direction,default horizontal(false)
   * itemLen, //[optional]width(or height) for each item
   * itemCount,//[optional]total item length for the list
   * totalLen,//[optional]total width(or height) for the list
   *
   * enableDrag, //[optional]enable drag to move,default false
   * enableLoop, //[optional]enable infinite loop,default false
   * enableAutorun, //[optional]enable auto play,default false
   * enableProcess, //[optional]enable default navigation process UI,default false
   *
   * moveTimeout, //[optional]time out for next move,default 100ms
   * moveDuration, //[optional]time out for one move duration,default 640
   * moveRate, //[optional]speed for animate one move,default 1.3
   * dragAnim, //[optional]drag move animation timing function,default 'cubic-bezier(0.075, 0.82, 0.165, 1)'
   * moveAnim, //[optional]auto move animation timing function,default 'ease'
   *
   * onMove, //[optional]on moving event listener
   * onFirst, //[optional]on first slide event listener
   * onLast, //[optional]on last slide event listener
   * onTouchstart, //[optional]on touchstart event listener
   * onTouchend, //[optional]on touchend  event listener
   * onTouchmove //[optional]on touchmove  event listener
   * }
   *
   * @method next() //move to next slide
   * @method pre() //move to pre slide
   * @method moveTo(index) //move to specified index slide,start from 0
   * @method reset() //reset to default state
   * @method refresh() //refresh for content changed
   * @method startAutoRun() //start to auto play
   * @method stopAutoRun() //stop auto play
   * @constructor Slider
   */
  function Slider(option) {
    option = option || {};
    var me = this,
      emptyFn = function () {
      },
      el = option.listEl || option.el.find(option.listCls || '.list'),
      pEl = option.processEl || el.siblings(option.processCls || '.process'),
      isMoving = false,
      moveTimeout = option.moveTimeout || 100,
      moveDuration = option.moveDuration || 640,
      moveRate = option.moveRate || 1.3,
      vertical = option.vertical,
      index = 0,
      totalLen,
      itemCount,
      itemLen,
      orientation = true,
      lastMove = 0,
      autoTimer = 0,
      loopTimer = 0,
      loopCls = 'slider-duplicate',
      moveToFn = vertical ? moveToY : moveToX;
    resetSize();
    calculateSize();
    var enableProcess = option.enableProcess,
      enableAutorun = option.enableAutorun,
      enableDrag = option.enableDrag,
      enableLoop = option.enableLoop;
    var onMove = option.onMove || emptyFn,
      onFirst = option.onFirst || emptyFn,
      onLast = option.onLast || emptyFn,
      onTouchstart = option.onTouchstart || emptyFn,
      onTouchend = option.onTouchend || emptyFn,
      onTouchmove = option.onTouchmove || emptyFn;
    var dragAnim = option.dragAnim || 'cubic-bezier(0.075, 0.82, 0.165, 1)',//'cubic-bezier(0.1, 0.57, 0.1, 1)';
      moveAnim = option.moveAnim || 'ease';
    var drag = {
      moved: false,
      timer: 0,
      dirX: 0,
      distX: 0,
      dirY: 0,
      distY: 0,
      moveDistX: 0,
      maxMove: itemLen / 2,
      startTime: 0,
      endTime: 0,
      resetMaxMove: function () {
        drag.maxMove = itemLen / 2;
      },
      distPos: function () {
        return drag[vertical ? 'distY' : 'distX'];
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
        var mX = -(index + (enableLoop ? 1 : 0)) * itemLen,
          dx = Math.round(Math.abs(drag.distPos()) / moveRate);
        drag.moveDistX = dx;
        if (dx > itemLen * 9 / 10) {
          drag.endDrag();
          return;
        } else if (drag.distPos() > 0) {
          mX += dx;
        } else {
          mX -= dx;
        }

        moveToFn(mX, 0, dragAnim);
        lastMove = -mX;
      },
      endDrag: function () {
        drag.moved = false;
        var mX = -index * itemLen,
          dx = drag.moveDistX;
        if (drag.isSwipe) {
          drag.distPos() > 0 ? me.pre() : me.next();
        } else {
          if (drag.distPos() > 0) {
            mX += dx;
          } else {
            mX -= dx;
          }
          if (mX >= 0 || mX <= -(totalLen - itemLen) || dx < drag.maxMove) {
            move();
          } else {
            drag.distPos() > 0 ? me.pre() : me.next();
          }
        }

        drag.reset();
        me.startAutoRun();
      }
    };

    function touchStart(e) {
      if (itemCount < 2 || isMoving) {
        return;
      }
      drag.startTime = new Date().getTime();
      onTouchstart();
      me.stopAutoRun();
      totalLen = totalLen || el.width();
      itemLen = itemLen || (totalLen / itemCount);
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
        drag.isSwipe = drag.endTime - drag.startTime <= 200 && Math.abs(drag.distPos()) > 30;
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

    function move() {
      if (isMoving) {
        return;
      }
      isMoving = true;
      setTimeout(function () {
        isMoving = false;
      }, moveTimeout);
      if (!enableLoop) {
        if (index > itemCount - 1) {
          index = itemCount - 1;
          onLast(index);
        } else if (index < 0) {
          index = 0;
          onFirst(index);
        }
      }
      var mx = (index + (enableLoop ? 1 : 0)) * itemLen,
        absm = Math.abs(lastMove - mx),
        mtime = Math.min(moveDuration, (moveDuration / itemLen) * absm),
        animate = moveAnim;

      if (drag.isSwipe) {
        var velocity = drag.moveDistX * moveRate / (drag.endTime - drag.startTime);
        mtime = velocity * absm;
        animate = dragAnim;
      }

      lastMove = mx;
      //修正android差1px的问题
      //mx = (mx>0&&$.os.android)?(mx+1):mx;
      moveToFn(-mx, mtime, animate);

      stopLoopHelper();
      if (enableLoop) {
        var loopm;
        if (index > itemCount - 1) {
          loopm = itemLen;
          index = 0;
          lastMove = itemLen;
          onLast(index);
        } else if (index < 0) {
          loopm = itemLen * itemCount;
          index = itemCount - 1;
          onFirst(index);
        }
        loopTimer = loopm !== undefined && setTimeout(function () {
            moveToFn(-loopm);
          }, mtime);
      }
      runProcess();
      onMove(index);
    }

    function moveToX(x, time, anim) {
      moveTo(x, 0, time, anim);
    }

    function moveToY(x, time, anim) {
      moveTo(0, x, time, anim);
    }

    function moveTo(x, y, time, anim) {
      el.css({
        '-webkit-transform': 'translate3d(' + (x || 0) + 'px' + ',' + (y || 0) + 'px,0)',
        '-webkit-transition': '-webkit-transform ' + (time || 0) + 'ms ' + (anim || moveAnim)
      });
    }

    function stopLoopHelper() {
      loopTimer && clearInterval(loopTimer);
    }

    function moveOrientation() {
      calculateSize();
      if (!enableLoop && index == itemCount - 1) {
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

    function renderProcess() {
      if (enableProcess && itemCount > 1) {
        var tmp = [];
        for (var i = 0; i < itemCount; i++) {
          tmp.push('<div></div>');
        }
        pEl.html(tmp.join(''));
        pEl.show();
        runProcess();
      }
    }

    function renderLoop() {
      if (enableLoop) {
        el.find('.' + loopCls).remove();
        var cels = [].slice.call(el.children()),
          first = cels.pop().cloneNode(true),
          last = cels.shift().cloneNode(true);
        first.classList.add(loopCls);
        last.classList.add(loopCls);
        el.prepend(first);
        el.append(last);
      }
    }

    function runProcess() {
      if (!enableProcess) {
        return;
      }
      var processChild = pEl.find('div');
      processChild.removeClass('on');
      $(processChild[index]).addClass('on');
    }

    function resetSize() {
      el.find('.' + loopCls).remove();
      itemLen = option.itemLen || 0;
      itemCount = option.itemCount || 0;
      totalLen = option.totalLen || (itemCount * itemLen) || 0;
    }

    function calculateSize() {
      var child = el.children();
      itemLen = itemLen || child.eq(0)[vertical ? 'height' : 'width']();
      itemCount = itemCount || child.length;
      totalLen = totalLen || (itemLen * itemCount);
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

    this.moveTo = function (idx) {
      index = idx;
      move();
    }

    this.reset = function () {
      index = 0;
      orientation = true;
      me.stopAutoRun();
      pEl.hide();
      resetSize();
      calculateSize();
      renderLoop();
      lastMove = enableLoop ? itemLen : 0;
      moveToFn(-lastMove);
      drag.reset();
      renderProcess();
      me.startAutoRun();
    }

    this.refresh = function () {
      me.stopAutoRun();
      pEl.hide();
      resetSize();
      calculateSize();
      renderLoop();
      renderProcess();
      me.startAutoRun();
    }

    this.startAutoRun = function () {
      if (enableAutorun && itemCount > 1) {
        autoTimer = setInterval(function () {
          if (drag.moved) {
            return;
          }//如果拖动就停止
          moveOrientation();
        }, 3000);
      }
    }

    this.stopAutoRun = function () {
      autoTimer && clearInterval(autoTimer);
      stopLoopHelper();
    }

    this.reset();
  }

  return Slider;
});
