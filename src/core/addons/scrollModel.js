/*global ux */
exports.datagrid.events.SCROLL_START = "datagrid:scrollStart";
exports.datagrid.events.SCROLL_STOP = "datagrid:scrollStop";
exports.datagrid.events.TOUCH_DOWN = "datagrid:touchDown";
exports.datagrid.events.TOUCH_UP = "datagrid:touchUp";
exports.datagrid.coreAddons.scrollModel = function scrollModel(exp) {

    var result = exports.logWrapper('scrollModel', {}, 'orange', exp.dispatch), setup = false, unwatchSetup;

    /**
     * Listen for scrollingEvents.
     */
    function setupScrolling() {
        if (!exp.element.css('overflow')) {
            exp.element.css({overflow: 'auto'});
        }
        result.log('addScrollListener');
        exp.element[0].addEventListener('scroll', result.onUpdateScroll);
        addTouchEvents();
        setup = true;
        exp.flow.unique(result.onScrollingStop);
    }

    function addTouchEvents() {
        result.log('addTouchEvents');
        var content = exp.getContent();
        content.bind('touchstart', result.onTouchStart);
        content.bind('touchend', result.onTouchEnd);
        content.bind('touchcancel', result.onTouchEnd);
    }

    result.removeScrollListener = function removeScrollListener() {
        result.log('removeScrollListener');
        exp.element[0].removeEventListener('scroll', result.onUpdateScroll);
    };

    result.removeTouchEvents = function removeTouchEvents() {
        if (setup) {
            result.log('removeTouchEvents');
            exp.getContent().unbind('touchstart', result.onTouchStart);
            exp.getContent().unbind('touchend', result.onTouchEnd);
            exp.getContent().unbind('touchcancel', result.onTouchEnd);
        }
    };

    result.onTouchStart = function onTouchStart(event) {
        exp.values.touchDown = true;
        exp.dispatch(exports.datagrid.events.TOUCH_DOWN, event);
    };

    result.onTouchEnd = function onTouchEnd(event) {
        exp.values.touchDown = false;
        exp.dispatch(exports.datagrid.events.TOUCH_UP, event);
    };

    result.getScroll = function getScroll(el) {
        return (el || exp.element[0]).scrollTop;
    };

    result.setScroll = function setScroll(value) {
        exp.element[0].scrollTop = value;
        exp.values.scroll = value;
    };

    /**
     * When a scrollEvent is fired, recalculate the values.
     * @param event
     */
    result.onUpdateScroll = function onUpdateScroll(event) {
        var val = result.getScroll(event.target || event.srcElement);
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
        result.setScroll(value);
        if (immediately) {
            result.onScrollingStop();
        } else {
            result.waitForStop();
        }
    };

    result.clearOnScrollingStop = function clearOnScrollingStop() {
        exp.flow.remove(result.onScrollingStop);
    };

    /**
     * Wait for the datagrid to slow down enough to render.
     */
    result.waitForStop = function waitForStop() {
        if (exp.flow.async || exp.values.touchDown) {
            exp.flow.add(result.onScrollingStop, null, exp.options.updateDelay);
        } else {
            exp.flow.add(result.onScrollingStop);
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
     * @param {Boolean=} immediately
     */
    result.scrollToIndex = function scrollToIndex(index, immediately) {
        result.log('scrollToIndex');
        var offset = exp.getRowOffset(index);
        result.scrollTo(offset, immediately);
        return offset;
    };

    /**
     * Scroll to an item by finding it's normalized index.
     * @param item
     * @param {Boolean=} immediately
     */
    result.scrollToItem = function scrollToItem(item, immediately) {
        result.log('scrollToItem');
        var index = exp.getNormalizedIndex(item);
        if (index !== -1) {
            return result.scrollToIndex(index, immediately);
        }
        return exp.values.scroll;
    };

    /**
     * If the item is above or below the viewable area, scroll till it is in view.
     * @param itemOrIndex
     * @param immediately
     */
    result.scrollIntoView = function scrollIntoView(itemOrIndex, immediately) {
        result.log('scrollIntoView');
        var index = typeof itemOrIndex === 'number' ? itemOrIndex : exp.getNormalizedIndex(itemOrIndex),
            offset = exp.getRowOffset(index), rowHeight, viewHeight;
        if (offset < exp.values.scroll) { // it is above the view.
            result.scrollTo(offset, immediately);
            return;
        }
        viewHeight = exp.getViewportHeight();
        rowHeight = exp.templateModel.getTemplateHeight(exp.getData()[index]);
        if (offset >= exp.values.scroll + viewHeight - rowHeight) { // it is below the view.
            result.scrollTo(offset - viewHeight + rowHeight);
        }
        // otherwise it is in view so do nothing.
    };

    /**
     * Scroll to top.
     * @param immediately
     */
    result.scrollToTop = function (immediately) {
        result.log('scrollToTop');
        result.scrollTo(0, immediately);
    };

    /**
     * Scroll to bottom.
     * @param immediately
     */
    result.scrollToBottom = function (immediately) {
        result.log('scrollToBottom');
        var value = exp.getContentHeight() - exp.getViewportHeight();
        result.scrollTo(value >= 0 ? value : 0, immediately);
    };

    function destroy() {
        result.destroyLogger();
        unwatchSetup();
        if (setup) {
            result.removeScrollListener();
            result.removeTouchEvents();
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