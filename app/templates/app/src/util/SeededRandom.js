define(function (require, exports, module) {
  /**
   * 默认基于时间，返回指定范围内的随机数
   * 当seed不固定时速度比较慢，仅用于减少重复率
   * http://indiegamr.com/generate-repeatable-random-numbers-in-js/
   */
  function seededRandom(max, min, seed) {
    var seed = seed || new Date().getTime(),
      rnd;
    max = max || 1;
    min = min || 0;

    seed = (seed * 9301 + 49297) % 233280;
    rnd = seed / 233280;

    return min + rnd * (max - min);
  }

  return seededRandom;
});
