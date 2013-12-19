/*global ux */
exports.datagrid.events.SCROLL_START = "datagrid:scrollStart";
exports.datagrid.events.SCROLL_STOP = "datagrid:scrollStop";
exports.datagrid.coreAddons.scrollModel = function scrollModel(exp) {

    var result = {}, setup = false, unwatchSetup;

    /**
     * Listen for scrollingEvents.
     */
    function setupScrolling() {
        exp.element[0].addEventListener('scroll', result.onUpdateScroll);
        addTouchEvents();
        setup = true;
    }

    function addTouchEvents() {
        exp.getContent().on('touchstart', result.onTouchStart);
        exp.getContent().on('touchend', result.onTouchEnd);
    }

    result.removeTouchEvents = function removeTouchEvents() {
        if (setup) {
            exp.getContent().off('touchstart', result.onTouchStart);
            exp.getContent().off('touchend', result.onTouchEnd);
        }
    };

    result.onTouchStart = function onTouchStart(event) {
        exp.values.touchDown = true;
    };

    result.onTouchEnd = function onTouchEnd(event) {
        exp.values.touchDown = false;
    };

    /**
     * When a scrollEvent is fired, recalculate the values.
     * @param event
     */
    result.onUpdateScroll = function onUpdateScroll(event) {
        var val = (event.target || event.srcElement || exp.element[0]).scrollTop;
        if (exp.values.scroll !== val) {
            exp.dispatch(exports.datagrid.events.SCROLL_START, val);
            exp.values.speed = val - exp.values.scroll;
            exp.values.absSpeed = Math.abs(exp.values.speed);
            exp.values.scroll = val;
            exp.values.scrollPercent = ((exp.values.scroll / exp.getContentHeight()) * 100).toFixed(2);
        }
        result.waitForStop();
        exp.dispatch(exports.datagrid.events.ON_SCROLL, exp.values);
    };

    /**
     * Scroll to the numeric value.
     * @param value
     * @param {Boolean=} immediately
     */
    result.scrollTo = function scrollTo(value, immediately) {
        exp.element[0].scrollTop = value;
        if (immediately) {
            exp.values.scroll = value;
            clearTimeout(exp.values.scrollingStopIntv);
            result.onScrollingStop();
        } else {
            result.waitForStop();
        }
    };

    /**
     * Wait for the datagrid to slow down enough to render.
     */
    result.waitForStop = function waitForStop() {
        if (exp.flow.async || exp.values.touchDown) {
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
        exp.values.speed = 0;
        exp.values.absSpeed = 0;
        exp.flow.add(exp.render);
        exp.dispatch(exports.datagrid.events.SCROLL_STOP, exp.values.scroll);
    };

    /**
     * Scroll to the normalized index.
     * @param index
     */
    result.scrollToIndex = function scrollToIndex(index) {
        var offset = exp.getRowOffset(index);
        result.scrollTo(offset);
        return offset;
    };

    /**
     * Scroll to an item by finding it's normalized index.
     * @param item
     */
    result.scrollToItem = function scrollToItem(item) {
        var index = exp.getNormalizedIndex(item);
        if (index !== -1) {
            return result.scrollToIndex(index);
        }
        return exp.values.scroll;
    };

    function destroy() {
        unwatchSetup();
        if (setup) {
            exp.element[0].removeEventListener('scroll', result.onUpdateScroll);
            removeTouchEvents();
        }
    }

    /**
     * Wait till the grid is ready before we setup our listeners.
     */
    unwatchSetup = exp.scope.$on(exports.datagrid.events.READY, setupScrolling);

    result.destroy = destroy;

    exp.scrollModel = result;// all models should try not to pollute the main model to keep it clean.

    return exp;
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.scrollModel);