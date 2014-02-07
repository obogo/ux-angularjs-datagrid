/**
 * ##<a name="iScrollAddon">iScrollAddon</a>##
 * This requires [iscroll.js](https://github.com/cubiq/iscroll) to work.
 */
angular.module('ux').factory('iScrollAddon', function () {
    return function (inst) {
        // This is only needed for IOS devices. Android devices work fine without it.
        if (!exports.datagrid.options.isIOS) {
            return;
        }
        if (!IScroll) {
            throw new Error("IScroll (https://github.com/cubiq/iscroll) is required to use the iScrollAddon.");
        }
        var result = exports.logWrapper('iScrollAddon', {}, 'purple', inst.dispatch),
            scrolling = false,
            intv,
            myScroll,
            originalScrollModel = inst.scrollModel,
            unwatchRefreshRender,
            pollTimer,
            unwatchSetup,
            lastY = 0;

        unwatchSetup = inst.scope.$on(exports.datagrid.events.ON_READY, function () {
            originalScrollModel.removeScrollListener();
            unwatchSetup();
        });
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_RESET, refresh));

        function refresh() {
            if (!myScroll) {
                inst.element[0].style.overflowY = 'hidden';
                //TODO: these options need to be passed in.
                myScroll = new IScroll(inst.element[0], {
                    mouseWheel: true,
                    scrollbars: true,
                    bounce: true,
                    bindToWrapper: true,
                    tap: true,
                    interactiveScrollbars: true,
                    deceleration: 0.005,
                    click: true
                });
//                pollTimer = setInterval(speedUpdate, 100);
                myScroll.on('beforeScrollStart', beforeScrollStart);
                myScroll.on('scrollStart', beforeScrollStart);
                myScroll.on('scrollEnd', onScrollEnd);
            }
            myScroll._initEvents(true);
            myScroll.scroller = inst.getContent()[0];
            myScroll.scrollerStyle = myScroll.scroller.style;
            myScroll._initEvents();
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
            inst.dispatch(exports.datagrid.events.SCROLL_START, -myScroll.y);
        }

        function onScrollEnd() {
            stop();
            intv = setTimeout(scrollEnd, inst.options.updateDelay);
        }

        function scrollEnd() {
            inst.values.scroll = -myScroll.y;
            originalScrollModel.onScrollingStop();
            scrolling = false;
            refeshRender();
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

        function onUpdateScroll() {
            if (scrolling && myScroll.y !== lastY) {
                inst.values.speed = myScroll.y - lastY;
                inst.values.absSpeed = Math.abs(inst.values.speed);
                inst.values.scroll = -myScroll.y;
                lastY = myScroll.y;
                inst.values.scrollPercent = ((inst.values.scroll / inst.getContentHeight()) * 100).toFixed(2);
                inst.dispatch(exports.datagrid.events.ON_SCROLL, inst.values);
            }
        }

        result.getScroll = function () {
            return myScroll && myScroll.y || 0;
        };
        result.waitForStop = originalScrollModel.waitForStop;
        result.scrollTo = function (value, immediately) {
            myScroll.scrollTo(0, -value, immediately ? 0 : 200);
        };
        result.scrollToIndex = originalScrollModel.scrollToIndex;
        result.scrollToItem = originalScrollModel.scrollToItem;
        result.scrollIntoView = function (itemOrIndex) {
            originalScrollModel.scrollIntoView(itemOrIndex);
            inst.element[0].scrollTop = 0;
        };
        result.onScrollingStop = originalScrollModel.onScrollingStop;
        result.onUpdateScroll = onUpdateScroll;
        result.destroy = function destroy() {
            unwatchSetup();
            clearInterval(pollTimer);
            stop();
            originalScrollModel.destroy();
            if (myScroll) {
                myScroll.destroy();
            }
        };
        inst.scrollModel = result;
        return result;
    };
});