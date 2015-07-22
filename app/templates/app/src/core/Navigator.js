define(function (require, exports, module) {
  var Navigator = (function () {
    var frame,
      androidReg = /Android/gi,
      isAndroid = androidReg.test(navigator.platform) || androidReg.test(navigator.userAgent);
    /**
     * iframe 元素
     *
     * @property {Element} frame
     */
    frame = null;
    /**
     * append iframe
     *
     * @param frame
     */
    function appendFrame(frame){
      frame && document.body.appendChild(frame);
    }
    /**
     * 删除iframe
     *
     * @method removeFrame
     * @param {Element} frame 执行的方法
     */
    function removeFrame(frame) {
      frame && frame.parentNode.removeChild(frame);
    }

    /**
     * 创建iframe,帮助解决iOS的UIWebView没有JS API
     *
     * @method getFrame
     * @return {Element} iframe
     */
    function getFrame(src,name) {
      var _frame = document.createElement("iframe");
      _frame.setAttribute("style", "display:none;width:0;height:0;position: absolute;top:0;left:0;border:0;");
      _frame.setAttribute("height", "0px");
      _frame.setAttribute("width", "0px");
      _frame.setAttribute("frameborder", "0");
      name && _frame.setAttribute("name", name);
      if (src) {
        _frame.setAttribute("src", src);
      } else {
        appendFrame(_frame);
      }
      return _frame;
    }

    /**
     * 执行与客户端交互方法的命令
     *
     * @method excute
     * @param {String} ns 与客户端交互的协议server/类Class
     * @param {String} fn 执行的方法
     * @param {Object} option 参数
     * @param {boolean} single 是否是使用独立的iframe,默认false
     * @param {boolean} noframe 是否不通过iframe,默认false
     */
    function excute(ns, fn, option, single, noframe) {
      var data, command;
      data = option ? JSON.stringify(option) : '';//将JSON转换成字符串
      if (ns && (typeof ns == 'object') && ns[fn]) {//android
        ns[fn](data);
      } else {//iOS
        command = ns;
        if (typeof fn == 'string' && fn.length > 0) {
          command += fn + '/' + data;
        }
        protocol(command, single, noframe);
      }
    }

    /**
     * 执行与客户端交互的协议
     *
     * @method protocol
     * @param {String} command 执行的协议及命令
     * @param {boolean} single 是否是使用独立的iframe,默认false
     * @param {boolean} noframe 是否不通过iframe,默认false
     */
    function protocol(command, single, noframe) {
      var _frame, timer;
      //不通过iframe
      if (noframe) {
        window.location.href = command;
        return;
      }
      //通过iframe
      if (single) {
        if (isAndroid) {
          _frame = getFrame();
          _frame.setAttribute("src", command);
        } else {
          _frame = getFrame(command);
          appendFrame(_frame);
        }
        timer = setTimeout(function () {
          _frame && removeFrame(_frame);
        }, 30000);
        _frame.onload = _frame.onreadystatechange = function () {
          timer && clearTimeout(timer);
          _frame && removeFrame(_frame);
        }
      } else {
        frame = frame || getFrame();
        frame.setAttribute("src", command);
      }
    }

    return {
      protocol: protocol,
      excute: excute,
      getFrame: getFrame,
      appendFrame: appendFrame,
      removeFrame: removeFrame
    }
  })();//end Object Navigator

  return Navigator;
});
