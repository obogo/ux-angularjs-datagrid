/*
* uxDatagrid v.0.1.0
* (c) 2014, WebUX
* License: MIT.
*/
(function(exports, global){
angular.module("ux").factory("disableHoverWhileScrolling", function() {
    return function(exp) {
        var name = "disable-hover-while-scrolling", timer;
        function init() {
            exp.flow.log("init");
            ux.css.createClass("grid", "." + name + " *", "pointer-events: none !important;");
        }
        function scrollStart() {
            exp.flow.stopTimeout(timer);
            exp.flow.log("scrollStart");
            if (!exp.element[0].classList.contains(name)) {
                exp.element[0].classList.add(name);
            }
        }
        function scrollStop() {
            if (exp.flow.async) {
                timer = exp.flow.timeout(waitAfterScrollStopToDisableHover, 500);
            } else {
                waitAfterScrollStopToDisableHover();
            }
        }
        function waitAfterScrollStopToDisableHover() {
            exp.flow.log("scrollStop");
            exp.element[0].classList.remove(name);
        }
        exp.unwatchers.push(exp.scope.$on(ux.datagrid.events.SCROLL_START, scrollStart));
        exp.unwatchers.push(exp.scope.$on(ux.datagrid.events.SCROLL_STOP, scrollStop));
        init();
        return exp;
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
