define(function (require, exports, module) {
  /**
   * 模板解析
   * 1. 可接收 DOM Element,不支持 DOM Element 模板里嵌套模板
   * 2. 如果 DOM Element 中的元素的属性可加前缀micro-(或ntes-)，如img的src改为micro-src；及内样式style改为micro-style。以避免模板没有使用前生效。最终模板将会替换掉micro-(或ntes-)前缀。
   *
   * e.g.
   * <section>
   *     <script type="text/html">
   *     <h1><%=TITLE%></h1>
   *     <% for(var i=0;i<list.length;i++){ %>
     *         <article><%=list[i]%></article>
     *     <%}%>
   *     </script>
   * </section>
   *
   * 如果 mustache 参数为true,默认为false,可使用{{}},不支持JS表达式
   * e.g
   * <section>
   *     <script type="text/html">
   *     <h1>{{TITLE}}</h1>
   *     </script>
   * </section>
   */
  var microTmpl = function (mustache) {
    var intro = mustache ? '{{' : '<%',
      outro = mustache ? '}}' : '%>',
      tmplAttrs = ['micro-template', 'ntes-template'],
      childTmplAttrs = ['micro-template-child', 'ntes-template-child'];
    //http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object?answertab=votes#tab-top
    function isElement(o) {
      return (
        typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
        o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string"
      );
    }

    function hasChildTmplAttr(el) {
      var i = 0;
      for (; i < childTmplAttrs.length; i++) {
        if (el.hasAttribute(childTmplAttrs[i])) {
          return true;
        }
      }
      return false;
    }

    function removeChildTmplAttrs(el) {
      var i = 0;
      for (; i < childTmplAttrs.length; i++) {
        el.removeAttribute(childTmplAttrs[i]);
      }
    }

    function getTmpl(str) {
      //如果是DOM节点则取outerHTML或者innerHTML
      if (isElement(str)) {
        if (hasChildTmplAttr(str) || str.tagName.toLowerCase() == 'script') {
          var text = str.innerHTML;
          str.innerHTML = '';
          removeChildTmplAttrs(str);
          str = text;
        } else {
          str = str.outerHTML;
        }
      }
      //将模板中所有 micro-(或者micro-template,ntes-,ntes-template)替换为空
      return str && str.toString().replace(/(micro|ntes)-(template)?/g, '');
    }

    //http://ejohn.org/blog/javascript-micro-templating/
    var cache = {};

    function tmpl(str, data) {
      str = getTmpl(str);
      var reg1 = new RegExp('((^|' + outro + ")[^\t]*)'", 'g');
      var reg2 = new RegExp('\t' + (mustache ? '' : '=') + '(.*?)' + outro, 'g');
      var fn = !/\W/.test(str) ? //W大写，可以匹配任何一个字母或者数字或者下划线以外的字符
        cache[str] = cache[str] :
        new Function("obj",
          "var p=[],print=function(){p.push.apply(p,arguments);};"
          + "with(obj){p.push('"
          + str
            .replace(/[\r\t\n]/g, " ") //将"\r\t\n"先替换成" "
            //.split("<%").join("\t") //将模板开始符号"<%"全部替换成"\t"
            .split(intro).join("\t")//--> split("<%").join("\t")
            //.replace(/((^|%>)[^\t]*)'/g, "$1\r") //将将模板结束符号%>全部替换成\r
            .replace(reg1, "$1\r")//--> replace(/((^|%>)[^\t]*)'/g, "$1\r")
            //.replace(/\t=(.*?)%>/g, "',$1,'") //将=与%>之间的变量替换成",变量,"
            .replace(reg2, "',$1,'")//--> replace(/\t=(.*?)%>/g, "',$1,'")
            .split("\t").join("');") //将之前替换的"\t"再替换成");"
            //.split("%>").join("p.push('")
            .split(outro).join("p.push('")//-->split("%>").join("p.push('")
            .split("\r").join("\\'")
          + "');}return p.join('');");
      return data ? fn(data) : fn;
    }

    return tmpl;
  };
  return microTmpl;
});
