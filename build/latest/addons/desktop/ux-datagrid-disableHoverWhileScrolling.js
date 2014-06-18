/*
* uxDatagrid v.1.0.2
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
/**
 * Based on the article here for a performance increase or prevention of performance degradation
 * when hover elements are added to a grid. If your grid has lots of hover events this will keep
 * them from reducing your fps.
 * http://www.thecssninja.com/javascript/pointer-events-60fps
 */
angular.module("ux").factory("disableHoverWhileScrolling", function() {
    return function(inst) {
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
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
