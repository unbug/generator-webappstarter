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
      totalWidth,
      itemLength,
      itemWidth,
      orientation = true,
      lastMove = 0,
      autoTimer = 0,
      loopTimer = 0,
      loopCls = 'slider-duplicate';
    calculateSize();
    var enablePrecess = option.enablePrecess || option.enableProcess,
      enableAutorun = option.enableAutorun,
      enableDrag = option.enableDrag,
      enableLoop = option.enableLoop;
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
        var mX = -(index+(enableLoop?1:0)) * itemWidth,
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

        moveToX(mX,0,bezier);
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
      me.stopAutoRun();
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
      if(!enableLoop){
        if (index > itemLength - 1) {
          index = itemLength - 1;
          onLast(index);
        } else if (index < 0) {
          index = 0;
          onFirst(index);
        }
      }
      var mx = (index+(enableLoop?1:0)) * itemWidth,
        absm = Math.abs(lastMove - mx),
        mtime = Math.min(moveDuration,(moveDuration / itemWidth) * absm),
        animate = 'ease';

      if (drag.isSwipe) {
        var velocity = drag.moveDistX * moveRate / (drag.endTime - drag.startTime);
        mtime = velocity * absm;
        animate = bezier;
      }

      lastMove = mx;
      //修正android差1px的问题
      //mx = (mx>0&&$.os.android)?(mx+1):mx;
      moveToX(-mx,mtime,animate);

      stopLoopHelper();
      if(enableLoop){
        var loopm;
        if (index > itemLength - 1) {
          loopm = itemWidth;
          index = 0;
          lastMove = itemWidth;
          onLast(index);
        } else if (index < 0) {
          loopm = itemWidth*itemLength;
          index = itemLength - 1;
          onFirst(index);
        }
        loopTimer = loopm!==undefined && setTimeout(function(){
          moveToX(-loopm);
        },mtime);
      }
      runProcess();
      onMove(index);
    }

    function moveToX(x,time,anim){
      el.css({
        '-webkit-transform': 'translate3d('+(x||0)+'px'+',0,0)',
        '-webkit-transition': '-webkit-transform '+(time||0)+'ms ' + (anim||bezier)
      });
    }

    this.reset = function () {
      index = 0;
      orientation = true;
      me.stopAutoRun();
      pEl.hide();
      resetSize();
      calculateSize();
      renderLoop();
      lastMove = enableLoop?itemWidth:0;
      moveToX();
      drag.reset();
      renderProcess();
      me.startAutoRun();
    }
    this.refresh = function(){
      me.stopAutoRun();
      pEl.hide();
      resetSize();
      calculateSize();
      renderLoop();
      renderProcess();
      me.startAutoRun();
    }
    this.stopAutoRun = function () {
      autoTimer && clearInterval(autoTimer);
      stopLoopHelper();
    }
    function stopLoopHelper(){
      loopTimer && clearInterval(loopTimer);
    }
    function moveOrientation() {
      calculateSize();
      if (!enableLoop && index == itemLength - 1) {
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

    function renderLoop(){
      if (enableLoop){
        el.find('.'+loopCls).remove();
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
      if (!enablePrecess) {
        return;
      }
      var processChild = pEl.find('div');
      processChild.removeClass('on');
      $(processChild[index]).addClass('on');
    }

    function resetSize(){
      el.find('.'+loopCls).remove();
      totalWidth = 0;
      itemLength = 0;
      itemWidth = 0;
    }
    function calculateSize(){
      totalWidth = totalWidth || el.width();
      itemLength = itemLength || el.children().length;
      itemWidth = itemWidth || (totalWidth / itemLength);
    }

    this.reset();
  }

  return Slider;
});
