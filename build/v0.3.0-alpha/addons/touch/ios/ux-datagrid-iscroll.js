/*
* uxDatagrid v.0.3.0-alpha
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
angular.module("ux").factory("iScrollAddon", function() {
    return function(inst) {
        var result = exports.logWrapper("iScrollAddon", {}, "purple", inst.dispatch), myScroll, originalScrollModel = inst.scrollModel;
        originalScrollModel.removeScrollListener();
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_RESET, refresh));
        function refresh() {
            if (!myScroll) {
                myScroll = new IScroll(inst.element[0], {
                    mouseWheel: true,
                    scrollbars: true,
                    bounce: true,
                    click: true
                });
                myScroll.on("scrollEnd", function() {
                    inst.values.scroll = -myScroll.y;
                    originalScrollModel.onScrollingStop();
                });
                myScroll._initEvents(true);
                myScroll.scroller = inst.getContent()[0];
                myScroll.scrollerStyle = myScroll.scroller.style;
                myScroll._initEvents();
            }
            // iScroll always needs to wait till the next frame for offsetHeight to update before refresh.
            setTimeout(function() {
                myScroll.refresh();
            }, 0);
        }
        result.scrollTo = function(value, immediately) {
            myScroll.scrollTo(0, value, 0);
        };
        result.scrollToIndex = originalScrollModel.scrollToIndex;
        result.scrollToItem = originalScrollModel.scrollToItem;
        inst.scrollModel = result;
        return result;
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
