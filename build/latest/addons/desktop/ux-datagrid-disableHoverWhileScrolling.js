/*
* ux-angularjs-datagrid v.1.1.8
* (c) 2015, WebUX
* https://github.com/webux/ux-angularjs-datagrid
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
 * Based on the article here for a performance increase or prevention of performance degradation
 * when hover elements are added to a grid. If your grid has lots of hover events this will keep
 * them from reducing your fps.
 * http://www.thecssninja.com/javascript/pointer-events-60fps
 */
angular.module("ux").factory("disableHoverWhileScrolling", function() {
    return [ "inst", function(inst) {
        var name = "disable-hover-while-scrolling", timer;
        function init() {
            inst.flow.log("init");
            ux.css.createClass("grid", "." + name + " *", "pointer-events: none !important;");
        }
        function scrollStart() {
            inst.flow.stopTimeout(timer);
            inst.flow.log("scrollStart");
            if (!inst.element[0].classList.contains(name)) {
                inst.element[0].classList.add(name);
            }
        }
        function scrollStop() {
            if (inst.flow.async) {
                timer = inst.flow.timeout(waitAfterScrollStopToDisableHover, 500);
            } else {
                waitAfterScrollStopToDisableHover();
            }
        }
        function waitAfterScrollStopToDisableHover() {
            inst.flow.log("scrollStop");
            inst.element[0].classList.remove(name);
        }
        inst.unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_SCROLL_START, scrollStart));
        inst.unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_SCROLL_STOP, scrollStop));
        init();
        return inst;
    } ];
});
}(this.ux = this.ux || {}, function() {return this;}()));
