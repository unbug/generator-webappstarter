var en_US = require('./en_US');
var zh_CN = require('./zh_CN');

var langs = {
  zh_CN: zh_CN
}

//https://github.com/jquery-i18n-properties/jquery-i18n-properties/blob/master/jquery.i18n.properties.js
function getLangName(lang) {
  if (!lang || lang.length < 2) {
    lang = (navigator.languages) ? navigator.languages[0]
      : (navigator.language || navigator.userLanguage /* IE */ || 'en');
  }

  lang = lang.toLowerCase();
  lang = lang.replace(/-/,"_"); // some browsers report language as en-US instead of en_US
  if (lang.length > 3) {
    lang = lang.substring(0, 3) + lang.substring(3).toUpperCase();
  }
  return lang;
}

function i18n() {
  this.getLangName = getLangName;
}
i18n.prototype = en_US;

function createI18n(lang) {
  var lang = langs[lang];

  if(lang) {
    Core.extend(i18n, lang);
  }else{
    lang = i18n;
  }
  return new lang;
}
var oI18n = createI18n(getLangName());
window.i18n = oI18n;

module.exports = oI18n;
