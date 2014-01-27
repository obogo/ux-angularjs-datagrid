/*
* uxDatagrid v.0.2.1
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
/*global ux */
// we want to override the default scrolling if it is an IOS device.
angular.module("ux").factory("windowScroll", function() {
    return function windowScroll(exp) {
        var result = exp.scrollModel;
        exp.calculateViewportHeight = function() {
            return window.screen.height;
        };
        result.onUpdateScroll = function onUpadateScroll(event) {
            var val = window.scrollY;
            if (exp.values.scroll !== val) {
                exp.dispatch(ux.datagrid.events.SCROLL_START, val);
                exp.values.speed = val - exp.values.scroll;
                exp.values.absSpeed = Math.abs(exp.values.speed);
                exp.values.scroll = val;
                exp.values.scrollPercent = (exp.values.scroll / exp.getContentHeight() * 100).toFixed(2);
            }
            result.waitForStop();
            exp.dispatch(ux.datagrid.events.ON_SCROLL, exp.values);
        };
        window.addEventListener("scroll", exp.scrollModel.onUpdateScroll);
        function resetScroll() {
            // force browser to start at 0,0 on page reload.
            var intv = setTimeout(function() {
                window.scrollBy(1, 1);
                window.scrollBy(-1, -1);
            });
        }
        exp.scope.$on(ux.datagrid.events.ON_READY, resetScroll);
        return exp;
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
