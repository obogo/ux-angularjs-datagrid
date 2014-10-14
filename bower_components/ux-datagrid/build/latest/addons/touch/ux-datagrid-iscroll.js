/*
* uxDatagrid v.1.1.2
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
/**
 * ##<a name="iScrollAddon">iScrollAddon</a>##
 * This requires [iscroll.js](https://github.com/cubiq/iscroll) to work.
 */
angular.module("ux").factory("iScrollAddon", function() {
    return [ "inst", function(inst) {
        // This is only needed for IOS devices. Android devices work fine without it.
        if (!exports.datagrid.isIOS) {
            return;
        }
        if (!IScroll) {
            throw new Error("IScroll (https://github.com/cubiq/iscroll) is required to use the iScrollAddon.");
        }
        var result = exports.logWrapper("iScrollAddon", {}, "purple", inst.dispatch), scrolling = false, intv, myScroll, originalScrollModel = inst.scrollModel, unwatchRefreshRender, scrollToIntv, unwatchSetup, lastY = 0;
        unwatchSetup = inst.scope.$on(exports.datagrid.events.ON_READY, function() {
            originalScrollModel.removeScrollListener();
            unwatchSetup();
        });
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_HEIGHTS_UPDATED_RENDER, refresh));
        function refresh() {
            var options = {
                mouseWheel: true,
                scrollbars: true,
                bounce: true,
                bindToWrapper: true,
                tap: true,
                interactiveScrollbars: true,
                deceleration: .005,
                click: true,
                startY: -(inst.scrollHistory && inst.scrollHistory.getCurrentScroll() || inst.values.scroll || 0)
            };
            if (!myScroll) {
                inst.element[0].style.overflowY = "hidden";
                //TODO: these options need to be passed in.
                result.log("IScroll Init at startY %s", options.startY);
                myScroll = new IScroll(inst.element[0], options);
                myScroll.on("beforeScrollStart", beforeScrollStart);
                myScroll.on("scrollStart", beforeScrollStart);
                myScroll.on("scrollEnd", onScrollEnd);
            }
            myScroll._initEvents(true);
            myScroll.scroller = inst.getContent()[0];
            myScroll.scrollerStyle = myScroll.scroller.style;
            myScroll._initEvents();
            myScroll.scrollTo(0, options.startY);
            // update the transform.
            result.iScroll = myScroll;
            refeshRender();
        }
        function refeshRender() {
            // iScroll always needs to wait till the next frame for offsetHeight to update before refresh.
            clearRefreshRender();
            unwatchRefreshRender = setInterval(onRefreshRender, 100);
        }
        function stop() {
            clearTimeout(intv);
        }
        function beforeScrollStart() {
            stop();
            scrolling = true;
            inst.dispatch(exports.datagrid.events.ON_SCROLL_START, -myScroll.y);
        }
        function onScrollEnd() {
            stop();
            intv = setTimeout(scrollEnd, inst.options.updateDelay);
        }
        function scrollEnd() {
            inst.values.scroll = -myScroll.y;
            originalScrollModel.onScrollingStop();
            scrolling = false;
        }
        function clearRefreshRender() {
            clearInterval(unwatchRefreshRender);
        }
        function onRefreshRender() {
            var h;
            if (!inst.element) {
                clearRefreshRender();
            } else if (h = inst.element[0].offsetHeight) {
                clearRefreshRender();
                result.log("	refresh iscroll height:%s/%s", h, inst.getContentHeight());
                myScroll.refresh();
            }
        }
        function onUpdateScroll(event, forceValue) {
            var value = forceValue !== undefined ? -forceValue : myScroll.y;
            if (scrolling && value !== lastY) {
                inst.values.speed = value - lastY;
                inst.values.absSpeed = Math.abs(inst.values.speed);
                result.setScroll(-value);
                lastY = value;
                inst.values.scrollPercent = (inst.values.scroll / inst.getContentHeight() * 100).toFixed(2);
                result.fireOnScroll();
            }
        }
        result.getScroll = function() {
            return myScroll && myScroll.y || 0;
        };
        result.setScroll = function(value) {
            result.log("setScroll %s", value);
            inst.values.scroll = value;
        };
        result.waitForStop = originalScrollModel.waitForStop;
        result.scrollTo = function(value, immediately) {
            result.log("scrollTo %s", value);
            if (inst.element[0].scrollTop) {
                inst.element[0].scrollTop = 0;
            }
            if (!myScroll) {
                refresh();
            }
            value = originalScrollModel.capScrollValue(value);
            myScroll.scrollTo(0, -value, immediately ? 0 : 200);
            clearTimeout(scrollToIntv);
            if (immediately) {
                if (inst.values.scroll || value) {
                    scrolling = true;
                    result.onUpdateScroll(null, value);
                    scrolling = false;
                    result.onScrollingStop();
                }
            } else {
                scrollToIntv = setTimeout(function() {
                    result.onScrollingStop();
                }, 200);
            }
        };
        result.scrollToIndex = originalScrollModel.scrollToIndex;
        result.scrollToItem = originalScrollModel.scrollToItem;
        result.scrollIntoView = originalScrollModel.scrollIntoView;
        result.scrollToBottom = function(immediately) {
            var value = inst.getContentHeight() - inst.getViewportHeight();
            myScroll.scrollTo(0, -value, immediately ? 0 : 200);
        };
        result.onScrollingStop = originalScrollModel.onScrollingStop;
        result.onUpdateScroll = onUpdateScroll;
        result.fireOnScroll = originalScrollModel.fireOnScroll;
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_HEIGHTS_UPDATED_RENDER, function() {
            inst.element[0].scrollTop = 0;
            if (myScroll) {
                onRefreshRender();
            }
        }));
        result.destroy = function destroy() {
            unwatchSetup();
            clearTimeout(scrollToIntv);
            stop();
            originalScrollModel.destroy();
            if (myScroll) {
                myScroll.destroy();
            }
        };
        inst.scrollModel = result;
        return result;
    } ];
});
}(this.ux = this.ux || {}, function() {return this;}()));
