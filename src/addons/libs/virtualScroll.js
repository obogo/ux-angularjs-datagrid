ux.datagrid.events.VIRTUAL_SCROLL_TOP = 'virtualScroll:top';
ux.datagrid.events.VIRTUAL_SCROLL_BOTTOM = 'virtualScroll:bottom';
// For simulating the scroll in IOS that doesn't have a smooth scroll natively.
ux.datagrid.VirtualScroll = function VirtualScroll(scope, element, vals, callback) {
    var friction = 0.95, stopThreshold = 0.05, result = {}, _x = 0, _y = 0, max, top = 0, bottom = 0,
        enabled = true,
        touchStart = 'touchstart', touchEnd = 'touchend', touchMove = 'touchmove', touchCancel = 'touchCancel',
        values = angular.extend({
            scrollingStopIntv: null,
            scroll: 0,
            speed: 0,
            absSpeed: 0,
            touchDown: false
        }, vals);

    result.scope = scope;
    result.element = element;
    result.content = element.children();
    result.values = values;

    function setup() {
        element.css({overflow: 'hidden'});
        result.content.on(touchStart, onTouchStart);
    }

    function clearIntv() {
        clearTimeout(values.scrollingStopIntv);
        values.scrollingStopIntv = 0;
    }

    function stopEvent(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    function onTouchStart(e) {
        if (!enabled) {
            return;
        }
        clearIntv();
        if (e.touches[0] && e.touches[0].target && e.touches[0].target.tagName.match(/input|textarea|select/i)) {
            return;
        }
        max = element[0].scrollHeight;
        var touch = e.touches[0];
        _x = touch.pageX;
        _y = touch.pageY;
        values.touchDown = true;
        stopEvent(event);
        updateBottom();
        addTouchEnd();
    }

    function updateBottom() {
        bottom = getHeight(result.content) - element[0].offsetHeight;
    }

    function getHeight(elms) {
        var totals = {height: 0};
        ux.each(elms, onGetHeight, totals);
        return totals.height;
    }

    function onGetHeight(item, index, list, params) {
        params.height += item.offsetHeight;
    }

    result.enable = function enable(value, speed) {
        enabled = !!value;
        if (!enabled) {
            removeTouchEnd();
        } else if (enabled && speed) {
            updateBottom();
            values.touchDown = false;
            _y = element[0].offsetTop + (element[0].offsetHeight * 0.5);
            values.speed = speed;
            values.absSpeed = Math.abs(speed);
            clearIntv();
            values.scrollingStopIntv = setTimeout(applyFriction);
        }
    };

    function addTouchEnd() {
        ux.each(result.content, function (el) {
            el.addEventListener(touchMove, onTouchMove, true);
            el.addEventListener(touchEnd, onTouchEnd, true);
            el.addEventListener(touchCancel, onTouchEnd, true);
        });
    }

    function removeTouchEnd() {
        ux.each(result.content, function (el) {
            el.removeEventListener(touchMove, onTouchMove, true);
            el.removeEventListener(touchEnd, onTouchEnd, true);
            el.removeEventListener(touchCancel, onTouchEnd, true);
        });
    }

    function onTouchEnd(event) {
        if (enabled) {
            values.touchDown = false;
            stopEvent(event);
            removeTouchEnd();
            applyFriction();
        }
    }

    function onTouchMove(event) {
        if (enabled) {
            stopEvent(event);
            var touch = event.changedTouches[0];
            updateScroll(touch.pageX, touch.pageY);
        }
    }

    function updateScroll(x, y) {
        var deltaX = _x + x, deltaY = _y - y;
        if (values.scroll + deltaY <= 0) {
            if (values.scroll) {
                result.dispatch(ux.datagrid.events.VIRTUAL_SCROLL_TOP, result, deltaY);
            }
            values.speed = -values.scroll;
            values.absSpeed = Math.abs(values.speed);
            values.scroll = deltaY = 0;
        } else if (values.scroll + deltaY >= bottom) {
            if (values.scroll !== bottom) {
                result.dispatch(ux.datagrid.events.VIRTUAL_SCROLL_BOTTOM, result, deltaY);
            }
            values.scroll = bottom;
            values.speed = 0;
            values.absSpeed = 0;
        } else {
            values.speed = deltaY;
            values.scroll += deltaY;//result.cap(values.scroll + deltaY);
            values.absSpeed = Math.abs(deltaY);
        }
        _y = y;
        _x = x;
        render();
        if (!values.touchDown) {
            clearIntv();
            values.scrollingStopIntv = setTimeout(applyFriction);
        }
    }

    result.dispatch = function dispatch() {
        scope.$emit.apply(scope, arguments);
    };

    result.cap = function cap(value) {
        var v = Math.abs(value);
        v = v > bottom ? bottom : (v < top ? top : v);
        return value < 0 ? -v : v;
    };

    function applyFriction() {
        if (values.absSpeed >= stopThreshold) {
            updateScroll(_x, _y - values.speed * friction);
        } else {
            result.onScrollingStop();
        }
    }

    function render() {
        var value = element[0].scrollTop - values.scroll;
        result.content.css({webkitTransform: "translate3d(0px, " + value + "px, 0px)"});
    }

    result.getValues = function getValues() {
        return values;
    };

    result.clear = function clearRender() {
        result.content.css({webkitTransform: ""});
    };

    /**
     * Scroll to the numeric value.
     * @param value
     * @param {Boolean=} immediately
     */
    result.scrollTo = function scrollTo(value, immediately) {
        callback(value, immediately);
    };

    /**
     * When it stops render.
     */
    result.onScrollingStop = function onScrollingStop() {
        result.scrollTo(values.scroll, true);
    };

    result.destroy = function () {
        removeTouchEnd();
        element.off(touchStart, onTouchStart);
        values = null;
    };

    result.setup = setup;

    return result;
};