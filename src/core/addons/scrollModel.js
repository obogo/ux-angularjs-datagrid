/*global ux */
exports.datagrid.events.ON_SCROLL_START = "datagrid:scrollStart";
exports.datagrid.events.ON_SCROLL_STOP = "datagrid:scrollStop";
exports.datagrid.events.ON_TOUCH_DOWN = "datagrid:touchDown";
exports.datagrid.events.ON_TOUCH_UP = "datagrid:touchUp";
exports.datagrid.events.ON_TOUCH_MOVE = "datagrid:touchMove";
exports.datagrid.coreAddons.scrollModel = function scrollModel(inst) {

    var result = exports.logWrapper('scrollModel', {}, 'orange', inst),
        setup = false,
        enable = true,
        unwatchSetup,
        waitForStopIntv,
        hasScrollListener = false,
        lastScroll,
        bottomOffset = 0,
        lastRenderTime,
        // start easing
        startOffsetY,
        startOffsetX,
        offsetY,
        offsetX,
        startScroll,
        lastDeltaY,
        lastDeltaX,
        speed = 0,
        speedX = 0,
        startTime,
        distance,
        scrollingIntv,
        // end easing
        listenerData = [
            {event: 'touchstart', method: 'onTouchStart', enabled: true},
            {event: 'touchmove', method: 'onTouchMove', enabled: false},
            {event: 'touchend', method: 'onTouchEnd', enabled: true},
            {event: 'touchcancel', method: 'onTouchEnd', enabled: true}
        ];

    /**
     * Listen for scrollingEvents.
     */
    function setupScrolling() {
        unwatchSetup();
        if (!inst.element.css('overflow') || inst.element.css('overflow') === 'visible') {
            inst.element.css({overflow: 'auto'});
        }
        result.log('addScrollListener');
        addScrollListener();
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.SCROLL_TO_INDEX, function (event, index) {
            inst.scrollModel.scrollToIndex(index, true);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.SCROLL_TO_ITEM, function (event, item) {
            inst.scrollModel.scrollToItem(item, true);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.SCROLL_INTO_VIEW, function (event, itemOrIndex) {
            inst.scrollModel.scrollIntoView(itemOrIndex, true);
        }));
        addTouchEvents();
        setup = true;
    }

    function addScrollListener() {
        result.log("addScrollListener");
        hasScrollListener = true;
        inst.element[0].addEventListener('scroll', onUpdateScrollHandler);
    }

    function onBeforeReset() {
        if (inst.options.scrollModel && inst.options.scrollModel.manual) {
            listenerData[1].enabled = true;
        }
        if (hasScrollListener) {
            result.removeScrollListener();
            hasScrollListener = false;
        }
        result.removeTouchEvents();
    }

    function onAfterReset() {
        if (!hasScrollListener) {
            addScrollListener();
        }
        addTouchEvents();
    }

    function addTouchEvents() {
        result.log('addTouchEvents');
        var content = inst.getContent();
        exports.each(listenerData, function (item) {
            if (item.enabled) {
                result.log("\tadd %s", item.event);
                content.bind(item.event, result[item.method]);
            }
        });
    }

    result.fireOnScroll = function fireOnScroll() {
        if (inst.values.scroll !== lastScroll) {
            lastScroll = inst.values.scroll;
            inst.dispatch(exports.datagrid.events.ON_SCROLL, inst.values);
        }
    };

    result.removeScrollListener = function removeScrollListener() {
        result.log('removeScrollListener');
        inst.element[0].removeEventListener('scroll', onUpdateScrollHandler);
    };

    result.removeTouchEvents = function removeTouchEvents() {
        if (setup) {
            result.log('removeTouchEvents');
            var content = inst.getContent();
            exports.each(listenerData, function (item) {
                result.log("\tremove %s", item.event);
                content.unbind(item.event, result[item.method]);
            });
        }
    };

    function getTouches(event) {
        return event.touches || event.originalEvent.touches;
    }

    result.killEvent = function (event) {
        event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    };

    result.enable = function(value) {
        enable = !!value;
    };

    result.onTouchStart = function onTouchStart(event) {
        if (!enable) {
            return;
        }
        clearTimeout(scrollingIntv);
        inst.values.touchDown = true;
        offsetY = startOffsetY = getTouches(event)[0].clientY || 0;
        offsetX = startOffsetX = getTouches(event)[0].clientX || 0;
        if (inst.values.scroll < 0) {
            inst.values.scroll = 0;
        } else if (inst.values.scroll > bottomOffset) {
            inst.values.scroll = bottomOffset;
        }
        startScroll = inst.values.scroll;
        lastDeltaY = 0;
        lastDeltaX = 0;
        inst.dispatch(exports.datagrid.events.ON_TOUCH_DOWN, event);
    };

    result.onTouchMove = function (event) {
        if (!enable) {
            return;
        }
        if (inst.options.scrollModel && inst.options.scrollModel.preventTouchMove) {
            result.killEvent(event);
        }
        var y = getTouches(event)[0].clientY,
            x = getTouches(event)[0].clientX,
            deltaY = offsetY - y, deltaX = offsetX - x;
        if (deltaY !== lastDeltaY) {
            result.setScroll(result.capScrollValue(startScroll + deltaY));
            speed = deltaY - lastDeltaY;
            lastDeltaY = deltaY;
        }
        if (deltaX !== lastDeltaX) {
            result.setScroll(result.capScrollValue(startScroll + deltaY));
            speedX = deltaX - lastDeltaX;
            lastDeltaX = deltaX;
        }
        inst.dispatch(exports.datagrid.events.ON_TOUCH_MOVE, speed, deltaY, lastDeltaY, speedX, deltaX, lastDeltaX);
    };

    result.onTouchEnd = function onTouchEnd(event) {
        if (!enable) {
            return;
        }
        if (!inst.values.touchDown) {
            return;// don't allow it to double fire if touchcancel and touchend both fire.
        }
        inst.values.touchDown = false;
        inst.dispatch(exports.datagrid.events.ON_TOUCH_UP, event);
        if (listenerData[1].enabled) {
            if (Math.abs(lastDeltaY) < 2 && Math.abs(lastDeltaX) < 2) {
                result.click(event);
            } else {
                startTime = Date.now();
                distance = speed * inst.options.scrollModel.speed;
                result.scrollSlowDown(true);
            }
        }
        var sTop = inst.element[0].scrollTop;
        if (sTop < 0 || inst.getContentHeight() < inst.getViewportHeight()) {
            inst.element[0].scrollTop = 0;
        } else if (sTop > inst.getContentHeight() - inst.getViewportHeight()) {
            inst.element[0].scrollTop = inst.getContentHeight() - inst.getViewportHeight();
        }
    };

    result.scrollSlowDown = function (wait) {
        clearTimeout(scrollingIntv);
        var value, duration = Math.abs(speed) * inst.options.scrollModel.speed, t = duration - (Date.now() - startTime), prevDistance = distance, change;
        distance = result.easeOut(t, distance, speed || 0, duration);
        change = distance - prevDistance;
        if (Math.abs(change) < 5) {
            t = 0;
        }
        if (t > 0) {
            value = result.capScrollValue(inst.values.scroll + change);
            if (!wait) {
//                result.log("\tscroll %s of %s", value, inst.element[0].scrollHeight);
                inst.element[0].scrollTop = value;
            }
            scrollingIntv = setTimeout(result.scrollSlowDown, 20);
        }
    };

    result.easeOut = function easeOutQuad(t, b, c, d) {
        return -c * (t/=d)*(t-2) + b;
    };

    result.click = function (e) {
        //TODO: this needs to deprecate because this has finally been fixed in android. (Feb 5th 2015)
        // simulate click on android. Ignore on IOS.
        if (inst.options.scrollModel.simulateClick) {
            if (inst.options.scrollModel.simulateClick && target && !(/(SELECT|INPUT|TEXTAREA)/i).test(target.tagName)) {
                result.killEvent(e);
            }
            var target = e.target,
                ev;

            if (!inst.isDigesting(inst.$scope) && target && !(/(SELECT|INPUT|TEXTAREA)/i).test(target.tagName)) {
                ev = document.createEvent('MouseEvents');
                ev.initMouseEvent('click', true, true, e.view, 1,
                    target.screenX, target.screenY, target.clientX, target.clientY,
                    e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
                    0, null);

                ev._constructed = true;
                try {
                    inst.creepRenderModel.stop();
                    target.dispatchEvent(ev);
                } catch(err) {
                    // event could have been nulled. ignore.
                }
            }
        }
    };

    result.getScroll = function getScroll(el) {
        return (el || inst.element[0]).scrollTop;
    };

    result.setScroll = function setScroll(value) {
        var unwatch, chunkList = inst.chunkModel.getChunkList();
        if (!chunkList || !chunkList.height) {
            // wait until that height is ready then scroll.
            unwatch = inst.scope.$on(exports.datagrid.events.ON_AFTER_RENDER, function () {
                unwatch();
                result.setScroll(value);
            });
        } else if (inst.getContentHeight() - inst.getViewportHeight() >= value) {
            inst.element[0].scrollTop = value;
        }
        inst.values.scroll = value;
    };

    function onUpdateScrollHandler(event) {
        inst.scrollModel.onUpdateScroll(event);
    }

    /**
     * When a scrollEvent is fired, recalculate the values.
     * @param event
     */
    result.onUpdateScroll = function onUpdateScroll(event) {
        var val = inst.scrollModel.getScroll(event.target || event.srcElement);
        if (inst.values.scroll !== val) {
            inst.dispatch(exports.datagrid.events.ON_SCROLL_START, val);
            inst.values.speed = val - inst.values.scroll;
            inst.values.absSpeed = Math.abs(inst.values.speed);
            inst.values.scroll = val;
            inst.values.scrollPercent = ((inst.values.scroll / inst.getContentHeight()) * 100).toFixed(2);
        }
        inst.scrollModel.waitForStop();
        result.fireOnScroll();
    };

    result.capScrollValue = function (value) {
        var newVal;
        if (inst.getContentHeight() < inst.getViewportHeight()) {
            inst.log("\tCAPPED scroll value from %s to 0", value);
            value = 0;// couldn't make it. just scroll to the bottom.
        } else if (inst.getContentHeight() - value < inst.getViewportHeight()) { // don't allow to scroll past the bottom.
            newVal = inst.getContentHeight() - inst.getViewportHeight(); // this will be the bottom scroll.
            inst.log("\tCAPPED scroll value to keep it from scrolling past the bottom. changed %s to %s", value, newVal);
            value = newVal;
        }
        return value;
    };

    /**
     * Scroll to the numeric value.
     * @param value
     * @param {Boolean=} immediately
     */
    result.scrollTo = function scrollTo(value, immediately) {
        value = result.capScrollValue(value);
        if (value !== lastScroll) {
            inst.scrollModel.setScroll(value);
            if (immediately) {
                inst.scrollModel.onScrollingStop();
            } else {
                inst.scrollModel.waitForStop();
            }
            return true;
        }
        return false;
    };

    result.clearOnScrollingStop = function clearOnScrollingStop() {
        result.onScrollingStop();
    };

    function flowWaitForStop() {
        lastRenderTime = Date.now();
        inst.scrollModel.onScrollingStop();
    }

    /**
     * Wait for the datagrid to slow down enough to render.
     */
    result.waitForStop = function waitForStop() {
        var forceRender = false;
        clearTimeout(waitForStopIntv);
        result.log("waitForStop scroll = %s", inst.values.scroll);
        if (inst.options.renderWhileScrolling) {
            if (Date.now() - (inst.options.renderWhileScrolling > 0 || 0) > lastRenderTime) {
                forceRender = true;
            }
        }
        if (!forceRender && (inst.flow.async || inst.values.touchDown)) {
            waitForStopIntv = setTimeout(flowWaitForStop, inst.options.updateDelay);
        } else {
            flowWaitForStop();
        }
    };

    /**
     * When it stops render.
     */
    result.onScrollingStop = function onScrollingStop() {
        result.log("onScrollingStop %s", inst.values.scroll);
        result.checkForEnds();
        inst.values.speed = 0;
        inst.values.absSpeed = 0;
        inst.render();
        result.fireOnScroll();
        inst.dispatch(exports.datagrid.events.ON_SCROLL_STOP, inst.values);
        result.calculateBottomOffset();
    };

    /**
     * Scroll to the normalized index.
     * @param index
     * @param {Boolean=} immediately
     */
    result.scrollToIndex = function scrollToIndex(index, immediately) {
        result.log('scrollToIndex');
        var offset = inst.getRowOffset(index);
        inst.scrollModel.scrollTo(offset, immediately);
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
            return inst.scrollModel.scrollToIndex(index, immediately);
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
        compileRowSiblings(index);
        if (offset < inst.values.scroll) { // it is above the view.
            return inst.scrollModel.scrollTo(offset, immediately);
        }
        inst.updateViewportHeight();// always update the height before calculating. onResize is not reliable
        viewHeight = inst.getViewportHeight();
        rowHeight = inst.templateModel.getTemplateHeight(inst.getData()[index]);
        if (offset >= inst.values.scroll + viewHeight - rowHeight) { // it is below the view.
            return inst.scrollModel.scrollTo(offset - viewHeight + rowHeight, immediately);
        }
        // otherwise it is in view so do nothing.
        return false;
    };

    function compileRowSiblings(index) {
        if (inst.data[index - 1] && !inst.isCompiled(index - 1)) {
            inst.forceRenderScope(index - 1);
        }
        if (inst.data[index + 1] && !inst.isCompiled(index + 1)) {
            inst.forceRenderScope(index + 1);
        }
    }

    function onAfterHeightsUpdated() {
        if (hasScrollListener) {
            result.log('onAfterHeightsUpdated force scroll to %s', inst.values.scroll);
            inst.element[0].scrollTop = inst.values.scroll;
        }
    }

    /**
     * Scroll to top.
     * @param immediately
     */
    result.scrollToTop = function (immediately) {
        result.log('scrollToTop');
        inst.scrollModel.scrollTo(0, immediately);
    };

    /**
     * Scroll to bottom.
     * @param immediately
     */
    result.scrollToBottom = function (immediately) {
        result.log('scrollToBottom');
        var value = inst.getContentHeight() - inst.getViewportHeight();
        inst.scrollModel.scrollTo(value >= 0 ? value : 0, immediately);
    };

    /**
     * ###<a name="calculateBottomOffset">calculateBottomOffset</a>###
     * calculate the scroll value for when the grid is scrolled to the bottom.
     */
    result.calculateBottomOffset = function () {
        if (inst.rowsLength) {
            var i = inst.rowsLength - 1;
            result.bottomOffset = bottomOffset = (inst.getRowOffset(i) - inst.getViewportHeight()) + inst.getRowHeight(i);
        }
    };

    /**
     * ###<a name="onUpdateScroll">onUpdateScroll</a>###
     * When the scroll value updates. Determine if we are at the top or the bottom and dispatch if so.
     */
    result.checkForEnds = function () {
        if (inst.values.scroll && inst.values.scroll >= bottomOffset) {
            inst.dispatch(ux.datagrid.events.ON_SCROLL_TO_BOTTOM, inst.values.speed);
        } else if (inst.values.scroll <= 0) {
            inst.dispatch(ux.datagrid.events.ON_SCROLL_TO_TOP, inst.values.speed);
        }
    };

    function destroy() {
        clearTimeout(waitForStopIntv);
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
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_HEIGHTS_UPDATED, onAfterHeightsUpdated));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_RESET, onBeforeReset));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_RESET, onAfterReset));
    inst.unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_RENDER_AFTER_DATA_CHANGE, result.calculateBottomOffset));

    result.destroy = destroy;

    inst.scrollModel = result;// all models should try not to pollute the main model to keep it clean.

    return inst;
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.scrollModel);