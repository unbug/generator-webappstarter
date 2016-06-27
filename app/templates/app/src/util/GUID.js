function GUID() {
  return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[x]/g, function(c) {
    var num = Math.random() *16 | 0, v = c === 'x' ? num : (num&0x3|0x8);
    return v.toString(16);
  });
}

module.exports = GUID;
