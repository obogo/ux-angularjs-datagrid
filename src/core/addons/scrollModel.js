/*global ux */
exports.datagrid.events.SCROLL_START = "datagrid:scrollStart";
exports.datagrid.events.SCROLL_STOP = "datagrid:scrollStop";
exports.datagrid.coreAddons.scrollModel = function scrollModel(exp) {

    var started = false,
        result = {};

    /**
     * Listen for scrollingEvents.
     */
    function setupScrolling() {
        exp.element[0].addEventListener('scroll', result.onUpdateScroll);
        // make it auto destroy.
        exp.unwatchers.push(function () {
            exp.element[0].removeEventListener('scroll', result.onUpdateScroll);
        });
    }

    /**
     * When a scrollEvent is fired, recalculate the values.
     * @param event
     */
    result.onUpdateScroll = function onUpdateScroll(event) {
        var val = (event.target || event.srcElement || exp.element[0]).scrollTop;
        if (exp.values.scroll !== val) {
            if (!started) {
                console.log('start scrolling');
                started = true;
                exp.dispatch(exports.datagrid.events.SCROLL_START, val);
            }
            exp.values.speed = val - exp.values.scroll;
            exp.values.absSpeed = Math.abs(exp.values.speed);
            exp.values.scroll = val;
        }
        result.waitForStop();
    };

    /**
     * Scroll to the numeric value.
     * @param value
     */
    result.scrollTo = function scrollTo(value) {
        exp.element[0].scrollTop = value;
        result.waitForStop();
    };

    /**
     * Wait for the datagrid to slow down enough to render.
     */
    result.waitForStop = function waitForStop() {
        console.log("waitForStop");
        if (exp.flow.async) {
            clearTimeout(exp.values.scrollingStopIntv);
            exp.values.scrollingStopIntv = setTimeout(result.onScrollingStop, exp.options.updateDelay);
        } else {
            result.onScrollingStop();
        }
    };

    /**
     * When it stops render.
     */
    result.onScrollingStop = function onScrollingStop() {
        console.log("scrollingStop");
        exp.values.speed = 0;
        exp.values.absSpeed = 0;
        exp.flow.add(exp.render);
        if (started) {
            started = false;
            exp.dispatch(exports.datagrid.events.SCROLL_STOP, exp.values.scroll);
        }
    };

    /**
     * Scroll to the normalized index.
     * @param index
     */
    result.scrollToIndex = function scrollToIndex(index) {
        result.scrollTo(result.getRowOffset(index));
    };

    /**
     * Scroll to an item by finding it's normalized index.
     * @param item
     */
    result.scrollToItem = function scrollToItem(item) {
        var index = result.getNormalizedIndex(item);
        if (index !== -1) {
            exp.scrollToIndex(index);
        }
    };

    /**
     * Get the normalized index for an item.
     * @param item
     */
    result.getNormalizedIndex = function getNormalizedIndex(item) {
        return exp.data.indexOf(item);
    };

    function destroy() {

    }

    /**
     * Wait till the grid is ready before we setup our listeners.
     */
    exp.scope.$on(exports.datagrid.events.READY, setupScrolling);

    result.destroy = destroy;

    exp.scrollModel = result;// all models should try not to pollute the main model to keep it clean.

    return exp;
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.scrollModel);