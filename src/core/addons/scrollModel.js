/*global ux */
exports.datagrid.coreAddons.scrollModel = function scrollModel(datagrid) {

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
//        exp.flow.log("onUpdateScroll");
        var val = (event.target || event.srcElement || datagrid.element[0]).scrollTop;
        if (datagrid.values.scroll !== val) {
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
//        exp.flow.log("waitForStop");
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
        datagrid.flow.log("scrollingStop");
        datagrid.values.speed = 0;
        datagrid.values.absSpeed = 0;
        datagrid.flow.add(datagrid.render);
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