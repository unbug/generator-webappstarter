define(function (require, exports, module) {
  function Scratch(option) {
    option = option || {};
    var me = this,
      emptyFn = function () {
      },
      el = option.el,
      GlobalTouch = option.GlobalTouch,
      coverSrc = option.coverSrc,
      width = option.width || el.width(),
      height = option.height || el.height(),
      finger = option.finger || 60,
      minScratch = option.minScratch || 99,
      card, isReady, scratch,
      hasOnCardMinScratch = false;

    var onSetCover = option.onSetCover || emptyFn,
      onCoverReady = option.onCoverReady || emptyFn,
      onCardFirstScratch = option.onCardFirstScratch || emptyFn,
      onCardMinScratch = option.onCardMinScratch || emptyFn;

    function init() {
      card = createCard();
      me.reset();
      bindEvent();
    }

    this.reset = function () {
      scratch = {
        started: false,
        scratching: false,
        timer: 0
      }
      card.ctx.globalCompositeOperation = 'source-over';
      me.setCover(coverSrc);
      cancelRequestAnimFrame(scratch.timer);
    }
    function bindEvent() {
      var cEl = $(card.canvas);
      cEl.on('touchstart', function (e) {
        GlobalTouch.preventMove = true;
        if (!isReady) {
          return;
        }
        if (!scratch.started) {
          onCardFirstScratch();
        }
        scratch.started = true;
        scratch.scratching = true;
        card.offset = $(card.canvas).offset();

        var touch = e.touches[0];
        scratch.dirX = Math.floor(touch.pageX - card.offset.left);
        scratch.dirY = Math.floor(touch.pageY - card.offset.top);

        startScratch();
        drawScratch();
      });
      cEl.on('touchmove', function (e) {
        GlobalTouch.preventMove = true;
        var touch = e.touches[0];
        scratch.distX = Math.floor(touch.pageX - card.offset.left);
        scratch.distY = Math.floor(touch.pageY - card.offset.top);
      });
      cEl.on('touchend', function () {
        scratch.scratching = false;
        GlobalTouch.preventMove = false;
        card.ctx.closePath();
        cancelRequestAnimFrame(scratch.timer);
        if (!hasOnCardMinScratch && scratchPercentage() > minScratch) {
          onCardMinScratch();
          hasOnCardMinScratch = true;
        }
      });
    }

    function createCard() {
      var canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d');
      ctx.globalCompositeOperation = 'none';
      canvas.setAttribute('width', width);
      canvas.setAttribute('height', height);
      el.html(canvas);
      return {
        canvas: canvas,
        ctx: ctx
      }
    }

    this.setCover = function (src) {
      onSetCover();
      hasOnCardMinScratch = false;
      isReady = false;
      var _img = new Image();
      _img.onload = function () {
        drawCover(_img);
        _img = null;
      }
      _img.src = src;
    }
    function drawCover(image) {
      isReady = true;
      card.ctx.drawImage(image, 0, 0, width, height);
      onCoverReady(this);
    }

    function drawScratch() {
      if (scratch.scratching) {
        if (scratch.distX != scratch.lastDistX || scratch.distY != scratch.lastDistY) {
          scratch.lastDistX = scratch.distX;
          scratch.lastDistY = scratch.distY;
          card.ctx.lineTo(scratch.distX, scratch.distY);
          card.ctx.stroke();

          card.canvas.style['margin-right'] = card.canvas.style['margin-right'] == '1px' ? '0px' : '1px';
        }
        scratch.timer = requestAnimFrame(drawScratch);
      } else {
        card.ctx.closePath();
      }
    }

    function startScratch() {
      scratch.distX = scratch.dirX;
      scratch.distY = scratch.dirY;
      scratch.lastDistX = scratch.distX;
      scratch.lastDistY = scratch.distY;

      card.ctx.globalCompositeOperation = 'destination-out';
      card.ctx.lineJoin = 'round';
      card.ctx.lineCap = 'round';
      card.ctx.strokeStyle = '#000';
      card.ctx.lineWidth = finger;

      card.ctx.beginPath();
      card.ctx.arc(scratch.dirX, scratch.dirY, finger / 2, 0, Math.PI * 2, true);
      card.ctx.closePath();
      card.ctx.fill();
      card.ctx.beginPath();
      card.ctx.moveTo(scratch.dirX, scratch.dirY);
    }

    function scratchPercentage() {
      var hits = 0;
      var imageData = card.ctx.getImageData(0, 0, width, height);

      for (var i = 0, ii = imageData.data.length; i < ii; i = i + 4) {
        if (imageData.data[i] == 0 && imageData.data[i + 1] == 0 && imageData.data[i + 2] == 0 && imageData.data[i + 3] == 0) hits++;
      }

      return (hits / (width * height)) * 100;
    }

    this.destroy = function () {
      el.html('');
      card = null;
    }

    init();
  }

  return Scratch;
});
