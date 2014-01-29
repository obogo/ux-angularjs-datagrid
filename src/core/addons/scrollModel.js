/*global ux */
exports.datagrid.events.SCROLL_START = "datagrid:scrollStart";
exports.datagrid.events.SCROLL_STOP = "datagrid:scrollStop";
exports.datagrid.events.TOUCH_DOWN = "datagrid:touchDown";
exports.datagrid.events.TOUCH_UP = "datagrid:touchUp";
exports.datagrid.coreAddons.scrollModel = function scrollModel(inst) {

    var result = exports.logWrapper('scrollModel', {}, 'orange', inst.dispatch), setup = false, unwatchSetup, scrollListeners = [];

    /**
     * Listen for scrollingEvents.
     */
    function setupScrolling() {
        if (!inst.element.css('overflow')) {
            inst.element.css({overflow: 'auto'});
        }
        result.log('addScrollListener');
        inst.element[0].addEventListener('scroll', onUpdateScrollHandler);
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.SCROLL_TO_INDEX, function (event, index) {
            result.scrollToIndex(index, true);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.SCROLL_TO_ITEM, function (event, item) {
            result.scrollToItem(item, true);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.SCROLL_INTO_VIEW, function (event, itemOrIndex) {
            result.scrollIntoView(itemOrIndex, true);
        }));
        addTouchEvents();
        setup = true;
        inst.flow.unique(result.onScrollingStop);
    }

    function addTouchEvents() {
        result.log('addTouchEvents');
        var content = inst.getContent();
        content.bind('touchstart', result.onTouchStart);
        content.bind('touchend', result.onTouchEnd);
        content.bind('touchcancel', result.onTouchEnd);
    }

    result.removeScrollListener = function removeScrollListener() {
        result.log('removeScrollListener');
        inst.element[0].removeEventListener('scroll', onUpdateScrollHandler);
    };

    result.removeTouchEvents = function removeTouchEvents() {
        if (setup) {
            result.log('removeTouchEvents');
            inst.getContent().unbind('touchstart', result.onTouchStart);
            inst.getContent().unbind('touchend', result.onTouchEnd);
            inst.getContent().unbind('touchcancel', result.onTouchEnd);
        }
    };

    result.onTouchStart = function onTouchStart(event) {
        inst.values.touchDown = true;
        inst.dispatch(exports.datagrid.events.TOUCH_DOWN, event);
    };

    result.onTouchEnd = function onTouchEnd(event) {
        inst.values.touchDown = false;
        inst.dispatch(exports.datagrid.events.TOUCH_UP, event);
    };

    result.getScroll = function getScroll(el) {
        return (el || inst.element[0]).scrollTop;
    };

    result.setScroll = function setScroll(value) {
        inst.element[0].scrollTop = value;
        inst.values.scroll = value;
    };

    function onUpdateScrollHandler(event) {
        inst.flow.add(result.onUpdateScroll, [event]);
    }

    /**
     * When a scrollEvent is fired, recalculate the values.
     * @param event
     */
    result.onUpdateScroll = function onUpdateScroll(event) {
        var val = result.getScroll(event.target || event.srcElement);
        if (inst.values.scroll !== val) {
            inst.dispatch(exports.datagrid.events.SCROLL_START, val);
            inst.values.speed = val - inst.values.scroll;
            inst.values.absSpeed = Math.abs(inst.values.speed);
            inst.values.scroll = val;
            inst.values.scrollPercent = ((inst.values.scroll / inst.getContentHeight()) * 100).toFixed(2);
        }
        result.waitForStop();
        inst.dispatch(exports.datagrid.events.ON_SCROLL, inst.values);
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
        inst.flow.remove(result.onScrollingStop);
    };

    /**
     * Wait for the datagrid to slow down enough to render.
     */
    result.waitForStop = function waitForStop() {
        if (inst.flow.async || inst.values.touchDown) {
            inst.flow.add(result.onScrollingStop, null, inst.options.updateDelay);
        } else {
            inst.flow.add(result.onScrollingStop);
        }
    };

    /**
     * When it stops render.
     */
    result.onScrollingStop = function onScrollingStop() {
        inst.values.speed = 0;
        inst.values.absSpeed = 0;
        inst.flow.add(inst.render);
        inst.dispatch(exports.datagrid.events.SCROLL_STOP, inst.values.scroll);
    };

    /**
     * Scroll to the normalized index.
     * @param index
     * @param {Boolean=} immediately
     */
    result.scrollToIndex = function scrollToIndex(index, immediately) {
        result.log('scrollToIndex');
        var offset = inst.getRowOffset(index);
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
        var index = inst.getNormalizedIndex(item);
        if (index !== -1) {
            return result.scrollToIndex(index, immediately);
        }
        return inst.values.scroll;
    };

    /**
     * If the item is above or below the viewable area, scroll till it is in view.
     * @param itemOrIndex
     * @param immediately
     */
    result.scrollIntoView = function scrollIntoView(itemOrIndex, immediately) {
        result.log('scrollIntoView');
        var index = typeof itemOrIndex === 'number' ? itemOrIndex : inst.getNormalizedIndex(itemOrIndex),
            offset = inst.getRowOffset(index), rowHeight, viewHeight;
        if (offset < inst.values.scroll) { // it is above the view.
            result.scrollTo(offset, immediately);
            return;
        }
        viewHeight = inst.getViewportHeight();
        rowHeight = inst.templateModel.getTemplateHeight(inst.getData()[index]);
        if (offset >= inst.values.scroll + viewHeight - rowHeight) { // it is below the view.
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
        var value = inst.getContentHeight() - inst.getViewportHeight();
        result.scrollTo(value >= 0 ? value : 0, immediately);
    };

    function destroy() {
        result.destroyLogger();
        unwatchSetup();
        if (setup) {
            result.removeScrollListener();
            result.removeTouchEvents();
        }
        result = null;
        inst = null;
    }

    /**
     * Wait till the grid is ready before we setup our listeners.
     */
    unwatchSetup = inst.scope.$on(exports.datagrid.events.ON_READY, setupScrolling);

    result.destroy = destroy;

    inst.scrollModel = result;// all models should try not to pollute the main model to keep it clean.

    return inst;
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.scrollModel);