/*global ux */
exports.datagrid.events.SCROLL_START = "datagrid:scrollStart";
exports.datagrid.events.SCROLL_STOP = "datagrid:scrollStop";
exports.datagrid.coreAddons.scrollModel = function scrollModel(datagrid) {

    var started = false;

    /**
     * Listen for scrollingEvents.
     */
    function setupScrolling() {
        datagrid.element[0].addEventListener('scroll', datagrid.onUpdateScroll);
        datagrid.unwatchers.push(function () {
            datagrid.element[0].removeEventListener('scroll', datagrid.onUpdateScroll);
        });
    }

    /**
     * When a scrollEvent is fired, recalculate the values.
     * @param event
     */
    datagrid.onUpdateScroll = function onUpdateScroll(event) {
        var val = (event.target || event.srcElement || datagrid.element[0]).scrollTop;
        if (datagrid.values.scroll !== val) {
            if (!started) {
                console.log('start scrolling');
                started = true;
                datagrid.dispatch(exports.datagrid.events.SCROLL_START, val);
            }
            datagrid.values.speed = val - datagrid.values.scroll;
            datagrid.values.absSpeed = Math.abs(datagrid.values.speed);
            datagrid.values.scroll = val;
        }
        datagrid.waitForStop();
    };

    /**
     * Scroll to the numeric value.
     * @param value
     */
    datagrid.scrollTo = function scrollTo(value) {
        datagrid.element[0].scrollTop = value;
        datagrid.waitForStop();
    };

    /**
     * Wait for the datagrid to slow down enough to render.
     */
    datagrid.waitForStop = function waitForStop() {
        console.log("waitForStop");
        if (datagrid.flow.async) {
            clearTimeout(datagrid.values.scrollingStopIntv);
            datagrid.values.scrollingStopIntv = setTimeout(datagrid.onScrollingStop, datagrid.options.updateDelay);
        } else {
            datagrid.onScrollingStop();
        }
    };

    /**
     * When it stops render.
     */
    datagrid.onScrollingStop = function onScrollingStop() {
        console.log("scrollingStop");
        datagrid.values.speed = 0;
        datagrid.values.absSpeed = 0;
        datagrid.flow.add(datagrid.render);
        if (started) {
            started = false;
            datagrid.dispatch(exports.datagrid.events.SCROLL_STOP, datagrid.values.scroll);
        }
    };

    /**
     * Scroll to the normalized index.
     * @param index
     */
    datagrid.scrollToIndex = function scrollToIndex(index) {
        //TODO: implement
    };

    /**
     * Scroll to an item by finding it's normalized index.
     * @param item
     */
    datagrid.scrollToItem = function scrollToItem(item) {
        //TODO: implement
    };

    /**
     * Get the normalized index for an item.
     * @param item
     */
    datagrid.getNormalizedIndex = function getNormalizedIndex(item) {
        //TODO: implement
    };

    /**
     * Wait till the grid is ready before we setup our listeners.
     */
    datagrid.scope.$on(exports.datagrid.events.READY, setupScrolling);

    return datagrid;
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.scrollModel);