/*
* uxDatagrid v.0.3.0-alpha
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
angular.module("ux").factory("iScrollAddon", function() {
    return function(inst) {
        // Only allow this to be instantiated if it is a touch enabled device. Otherwise use the native.
        //        if (!inst.options.touchEnabled) {
        //            return;
        //        }
        var result = exports.logWrapper("iScrollAddon", {}, "purple", inst.dispatch), myScroll, originalScrollModel = inst.scrollModel, unwatchRefreshRender;
        originalScrollModel.removeScrollListener();
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_RESET, refresh));
        function refresh() {
            if (!myScroll) {
                //TODO: these options need to be passed in.
                myScroll = new IScroll(inst.element[0], {
                    mouseWheel: true,
                    scrollbars: true,
                    bounce: true,
                    bindToWrapper: true,
                    tap: true,
                    interactiveScrollbars: true,
                    click: true
                });
                myScroll.on("beforeScrollStart", beforeScrollStart);
                myScroll.on("scrollStart", beforeScrollStart);
                myScroll.on("scrollEnd", onScrollEnd);
                myScroll._initEvents(true);
                myScroll.scroller = inst.getContent()[0];
                myScroll.scrollerStyle = myScroll.scroller.style;
                myScroll._initEvents();
            }
            // iScroll always needs to wait till the next frame for offsetHeight to update before refresh.
            unwatchRefreshRender = setInterval(onRefreshRender, 1);
        }
        function beforeScrollStart() {
            inst.dispatch(exports.datagrid.events.SCROLL_START, -myScroll.y);
        }
        function onScrollEnd() {
            inst.values.scroll = -myScroll.y;
            originalScrollModel.onScrollingStop();
        }
        function clearRefreshRender() {
            clearInterval(unwatchRefreshRender);
        }
        function onRefreshRender() {
            if (!inst.element) {
                clearRefreshRender();
            } else if (inst.element[0].offsetHeight) {
                clearRefreshRender();
                myScroll.refresh();
            }
        }
        result.scrollTo = function(value, immediately) {
            myScroll.scrollTo(0, value, 0);
        };
        result.scrollToIndex = originalScrollModel.scrollToIndex;
        result.scrollToItem = originalScrollModel.scrollToItem;
        result.destroy = function destroy() {
            originalScrollModel.destroy();
            if (myScroll) {
                myScroll.destroy();
            }
        };
        inst.scrollModel = result;
        return result;
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
