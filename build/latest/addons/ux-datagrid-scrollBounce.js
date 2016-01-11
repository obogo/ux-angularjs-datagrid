/*!
* ux-angularjs-datagrid v.1.4.7
* (c) 2016, Obogo
* https://github.com/obogo/ux-angularjs-datagrid
* License: MIT.
*/
(function (exports, global) {
if (typeof define === "function" && define.amd) {
  define(exports);
} else if (typeof module !== "undefined" && module.exports) {
  module.exports = exports;
} else {
  global.ux = exports;
}

/**
 * ##<a name="scrollBounce">scrollBounce</a>##
 * Add a bounce based on the speed of the scroll in the grid to the top and bottom of the grid.
 */
angular.module("ux").factory("scrollBounce", function() {
    return [ "inst", function(inst) {
        var result = exports.logWrapper("scrollBounce", {}, "red", inst), intv, endScroll, transitioning = false, lastSpeed = 0, _elementStyle = document.createElement("div").style, _vendor = function() {
            var vendors = [ "t", "webkitT", "MozT", "msT", "OT" ], transform, i = 0, l = vendors.length;
            for (;i < l; i++) {
                transform = vendors[i] + "ransform";
                if (transform in _elementStyle) return vendors[i].substr(0, vendors[i].length - 1);
            }
            return false;
        }(), transform = _prefixStyle("transform"), transition = _prefixStyle("transition");
        function _prefixStyle(style) {
            if (_vendor === false) return false;
            if (_vendor === "") return style;
            return _vendor + style.charAt(0).toUpperCase() + style.substr(1);
        }
        function moveTo(value, time) {
            if (time) {
                inst.getContent().css(transition, time + "ms ease-out");
            } else {
                inst.getContent().css(transition, "");
            }
            inst.getContent().css(transform, "translate3d(0, " + -value + "px, 0)");
            transitioning = true;
            clearTimeout(intv);
            intv = setTimeout(onHitEndComplete, time || 100);
        }
        /**
         * ###<a name="onHitEnd">onHitEnd</a>###
         * When the end hits use the scroll speed to calculate the value of the time to wait and the distance to bounce.
         * Then apply the css transform bounce.
         * @param event
         */
        function onHitEnd(event, speed) {
            var time = 2 * Math.abs(inst.values.speed);
            lastSpeed = lastSpeed || inst.values.speed;
            endScroll = inst.values.scroll;
            moveTo(lastSpeed * 2, time);
        }
        /**
         * ###<a name="onHitEndComplete">onHitEndComplete</a>###
         * Remove the transition so it bounces back.
         */
        function onHitEndComplete() {
            inst.getContent().css(transition, "250ms ease-in");
            inst.getContent().css(transform, "");
            transitioning = false;
            lastSpeed = 0;
        }
        function onTouchMove(event, speed, deltaY, oldDeltaY) {
            if (speed <= 0 && inst.values.scroll <= 0) {
                lastSpeed += speed * .5;
                moveTo(lastSpeed);
            } else if (speed >= 0 && inst.values.scroll >= inst.scrollModel.bottomOffset) {
                lastSpeed += speed * .5;
                moveTo(lastSpeed);
            } else if (transitioning) {
                lastSpeed = 0;
            }
        }
        function onTouchUp(event) {
            lastSpeed = inst.values.speed;
        }
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_SCROLL_TO_TOP, onHitEnd));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_SCROLL_TO_BOTTOM, onHitEnd));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_TOUCH_MOVE, onTouchMove));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_TOUCH_UP, onTouchUp));
        result.destroy = function() {
            clearTimeout(intv);
            result = null;
        };
        inst.scrollBounce = result;
    } ];
});
}(this.ux = this.ux || {}, function() {return this;}()));
