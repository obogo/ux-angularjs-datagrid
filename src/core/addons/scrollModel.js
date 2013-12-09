/*global ux */
exports.datagrid.events.SCROLL_START = "datagrid:scrollStart";
exports.datagrid.events.SCROLL_STOP = "datagrid:scrollStop";
exports.datagrid.coreAddons.scrollModel = function scrollModel(exp) {

    var started = false;

    /**
     * Listen for scrollingEvents.
     */
    function setupScrolling() {
        exp.element[0].addEventListener('scroll', exp.onUpdateScroll);
        exp.unwatchers.push(function () {
            exp.element[0].removeEventListener('scroll', exp.onUpdateScroll);
        });
    }

    /**
     * When a scrollEvent is fired, recalculate the values.
     * @param event
     */
    exp.onUpdateScroll = function onUpdateScroll(event) {
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
        exp.waitForStop();
    };

    /**
     * Scroll to the numeric value.
     * @param value
     */
    exp.scrollTo = function scrollTo(value) {
        exp.element[0].scrollTop = value;
        exp.waitForStop();
    };

    /**
     * Wait for the datagrid to slow down enough to render.
     */
    exp.waitForStop = function waitForStop() {
        console.log("waitForStop");
        if (exp.flow.async) {
            clearTimeout(exp.values.scrollingStopIntv);
            exp.values.scrollingStopIntv = setTimeout(exp.onScrollingStop, exp.options.updateDelay);
        } else {
            exp.onScrollingStop();
        }
    };

    /**
     * When it stops render.
     */
    exp.onScrollingStop = function onScrollingStop() {
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
    exp.scrollToIndex = function scrollToIndex(index) {
        exp.scrollTo(exp.getRowOffset(index));
    };

    /**
     * Scroll to an item by finding it's normalized index.
     * @param item
     */
    exp.scrollToItem = function scrollToItem(item) {
        var index = exp.getNormalizedIndex(item);
        if (index !== -1) {
            exp.scrollToIndex(index);
        }
    };

    /**
     * Get the normalized index for an item.
     * @param item
     */
    exp.getNormalizedIndex = function getNormalizedIndex(item) {
        return exp.data.indexOf(item);
    };

    /**
     * Wait till the grid is ready before we setup our listeners.
     */
    exp.scope.$on(exports.datagrid.events.READY, setupScrolling);

    return exp;
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.scrollModel);