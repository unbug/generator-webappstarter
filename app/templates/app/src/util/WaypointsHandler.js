define(function (require, exports, module) {
  require('lib/zepto.waypoints');

  var WaypointsHandler = function (el) {
    var anim = ["callout.bounce", "callout.shake", "callout.flash", "callout.pulse", "callout.swing", "callout.tada",
      "transition.fadeIn", "transition.fadeOut",
      "transition.flipXIn", "transition.flipXOut", "transition.flipYIn", "transition.flipYOut",
      "transition.flipBounceXIn", "transition.flipBounceXOut", "transition.flipBounceYIn", "transition.flipBounceYOut",
      "transition.swoopIn", "transition.swoopOut",
      "transition.whirlIn", "transition.whirlOut",
      "transition.shrinkIn", "transition.shrinkOut",
      "transition.expandIn", "transition.expandOut",
      "transition.bounceIn", "transition.bounceOut", "transition.bounceUpIn", "transition.bounceUpOut", "transition.bounceDownIn", "transition.bounceDownOut", "transition.bounceLeftIn", "transition.bounceLeftOut", "transition.bounceRightIn", "transition.bounceRightOut",
      "transition.slideUpIn", "transition.slideUpOut", "transition.slideDownIn", "transition.slideDownOut", "transition.slideLeftIn", "transition.slideLeftOut", "transition.slideRightIn", "transition.slideRightOut", "transition.slideUpBigIn", "transition.slideUpBigOut", "transition.slideDownBigIn", "transition.slideDownBigOut", "transition.slideLeftBigIn", "transition.slideLeftBigOut", "transition.slideRightBigIn", "transition.slideRightBigOut",
      "transition.perspectiveUpIn", "transition.perspectiveUpOut", "transition.perspectiveDownIn", "transition.perspectiveDownOut", "transition.perspectiveLeftIn", "transition.perspectiveLeftOut", "transition.perspectiveRightIn", "transition.perspectiveRightOut"];
    el.find('*[data-velocity-effect="none"]').removeAttr('data-velocity-effect').removeAttr('data-velocity-offset');
    ['default', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'].forEach(function (key) {
      var vels = el.find('*[data-velocity-offset="' + key + '"]');
      vels[0] && vels.css({visibility: 'hidden'})
        .waypoint({
          offset: key == 'default' ? '70%' : key,
          handler: function (direction) {
            if (!this.element.VelocityEffectTriggered) {
              this.element.VelocityEffectTriggered = true;
              var cel = $(this.element);
              cel.css({visibility: 'visible'}).velocity(cel.attr('data-velocity-effect'));
            }
          }
        });
    });
  }

  return WaypointsHandler;
});
