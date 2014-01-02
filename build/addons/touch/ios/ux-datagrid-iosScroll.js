/*
* uxDatagrid v.0.1.0
* (c) 2014, WebUX
* License: MIT.
*/
(function(exports, global){
ux.datagrid.events.VIRTUAL_SCROLL_TOP = "virtualScroll:top";

ux.datagrid.events.VIRTUAL_SCROLL_BOTTOM = "virtualScroll:bottom";

ux.datagrid.VirtualScroll = function VirtualScroll(scope, element, vals, callback) {
    var friction = .95, stopThreshold = .05, result = {}, _x = 0, _y = 0, max, top = 0, bottom = 0, enabled = true, touchStart = "touchstart", touchEnd = "touchend", touchMove = "touchmove", touchCancel = "touchCancel", values = angular.extend({
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
        element.css({
            overflow: "hidden"
        });
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
        var totals = {
            height: 0
        };
        ux.each(elms, onGetHeight, totals);
        return totals.height;
    }
    function onGetHeight(item, index, list, params) {
        params.height += item.offsetHeight;
    }
    result.enable = function enable(value, speed) {
        if (value !== undefined) {
            enabled = !!value;
            if (!enabled) {
                removeTouchEnd();
            } else if (enabled && speed) {
                updateBottom();
                values.touchDown = false;
                _y = element[0].offsetTop + element[0].offsetHeight * .5;
                values.speed = speed;
                values.absSpeed = Math.abs(speed);
                clearIntv();
                values.scrollingStopIntv = setTimeout(applyFriction);
            }
        }
        return enabled;
    };
    function addTouchEnd() {
        ux.each(result.content, function(el) {
            el.addEventListener(touchMove, onTouchMove, true);
            el.addEventListener(touchEnd, onTouchEnd, true);
            el.addEventListener(touchCancel, onTouchEnd, true);
        });
    }
    function removeTouchEnd() {
        ux.each(result.content, function(el) {
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
            values.scroll += deltaY;
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
        v = v > bottom ? bottom : v < top ? top : v;
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
        result.content.css({
            webkitTransform: "translate3d(0px, " + value + "px, 0px)"
        });
    }
    result.getValues = function getValues() {
        return values;
    };
    result.clear = function clearRender() {
        result.content.css({
            webkitTransform: ""
        });
    };
    result.scrollTo = function scrollTo(value, immediately) {
        callback(value, immediately);
    };
    result.onScrollingStop = function onScrollingStop() {
        result.scrollTo(values.scroll, true);
    };
    result.destroy = function() {
        removeTouchEnd();
        element.off(touchStart, onTouchStart);
        values = null;
    };
    result.setup = setup;
    return result;
};

angular.module("ux").factory("iosScroll", function() {
    return function iosScroll(exp) {
        var vScroll, originalScrollModel = exp.scrollModel;
        if (!exports.datagrid.isIOS) {
            return exp;
        }
        vScroll = new ux.datagrid.VirtualScroll(exp.scope, exp.element, exp.values, function(value, immediately) {
            vScroll.clear();
            exp.values.scroll = vScroll.values.scroll;
            exp.values.speed = vScroll.values.speed;
            exp.values.absSpeed = vScroll.values.absSpeed;
            originalScrollModel.scrollTo(value, immediately);
        });
        exp.scope.$on(ux.datagrid.events.READY, function() {
            vScroll.content = exp.getContent();
            vScroll.setup();
        });
        vScroll.scrollToIndex = originalScrollModel.scrollToIndex;
        vScroll.scrollToItem = originalScrollModel.scrollToItem;
        exp.scrollModel = vScroll;
        return exp;
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
