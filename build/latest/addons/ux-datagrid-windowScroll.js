/*!
* ux-angularjs-datagrid v.1.6.10
* (c) 2018, Obogo
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

/*global ux */
// we want to override the default scrolling if it is an IOS device.
angular.module("ux").factory("windowScroll", function() {
    return [ "inst", function windowScroll(inst) {
        var result = inst.scrollModel;
        inst.calculateViewportHeight = function() {
            return window.screen.height;
        };
        result.onUpdateScroll = function onUpadateScroll(event) {
            var val = window.hasOwnProperty("scrollY") ? window.scrollY : window.pageYOffset;
            if (inst.values.scroll !== val) {
                inst.dispatch(ux.datagrid.events.ON_SCROLL_START, val);
                inst.values.speed = val - inst.values.scroll;
                inst.values.absSpeed = Math.abs(inst.values.speed);
                inst.values.scroll = val;
                inst.values.scrollPercent = (inst.values.scroll / inst.getContentHeight() * 100).toFixed(2);
            }
            result.waitForStop();
            inst.dispatch(ux.datagrid.events.ON_SCROLL, inst.values);
        };
        window.addEventListener("scroll", inst.scrollModel.onUpdateScroll);
        function resetScroll() {
            // force browser to start at 0,0 on page reload.
            var intv, scroll;
            if (inst.scrollHistory && (scroll = inst.scrollHistory.getCurrentScroll())) {
                setTimeout(function() {
                    window.scrollTo(0, scroll);
                });
            } else {
                intv = setTimeout(function() {
                    window.scrollBy(1, 1);
                    window.scrollBy(-1, -1);
                });
            }
        }
        inst.scope.$on(ux.datagrid.events.ON_READY, resetScroll);
        inst.scope.$on("$destroy", function() {
            window.removeEventListener("scroll", inst.scrollModel.onUpdateScroll);
        });
        return inst;
    } ];
});
}(this.ux = this.ux || {}, function() {return this;}()));
