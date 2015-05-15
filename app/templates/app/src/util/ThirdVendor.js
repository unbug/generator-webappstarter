define(function (require, exports, module) {
  /**
   * 第三方平台
   */
  var ua = window.navigator.userAgent;
  var vendor = null;

  function isUA(name) {
    var reg = new RegExp(name, 'gi');
    return reg.test(ua);
  }

  if (isUA('Deja')) {
    vendor = {
      code: 'Deja',
      name: 'DejaFashion'
    }
  }
  else if (isUA('FBAN')) {
    vendor = {
      code: 'Facebook',
      name: 'Facebook'
    }
  }
  else if (isUA('Twitter')) {
    vendor = {
      code: 'Twitter',
      name: 'Twitter'
    }
  }
  else if (isUA('Instagram')) {
    vendor = {
      code: 'Instagram',
      name: 'Instagram'
    }
  }
  else if (isUA('weibo')) {
    vendor = {
      code: 'Weibo',
      name: '微博'
    }
  }
  else if (isUA('MicroMessenger')) {
    vendor = {
      code: 'WX',
      name: '微信'
    }
  }
  else if (isUA('QQ')) {
    vendor = {
      code: 'QQ',
      name: 'QQ'
    }
  }
  else if (isUA('YiXin')) {
    vendor = {
      code: 'YX',
      name: '易信'
    }
  }

  return vendor;
});
