/*
* uxDatagrid v.0.2.0
* (c) 2014, WebUX
* License: MIT.
*/
(function(exports, global){
exports.datagrid.events.BEFORE_VIRTUAL_SCROLL_START = "virtualScroll:beforeScrollStart";

exports.datagrid.events.VIRTUAL_SCROLL_TOP = "virtualScroll:top";

exports.datagrid.events.VIRTUAL_SCROLL_BOTTOM = "virtualScroll:bottom";

exports.datagrid.events.ON_VIRTUAL_SCROLL_UPDATE = "virtualScroll:onUpdate";

exports.datagrid.VirtualScroll = function VirtualScroll(scope, element, vals, callback) {
    var friction = .95, stopThreshold = .01, moved = false, result = exports.logWrapper("VirtualScroll", {}, "redOrange", function() {
        scope.$emit.apply(scope, arguments);
    }), _x = 0, _y = 0, max, top = 0, bottom = 0, enabled = true, doubleTapTimer, offTouchEnd, touchStart = "touchstart", touchEnd = "touchend", touchMove = "touchmove", touchCancel = "touchCancel", values = angular.extend({
        scrollingStopIntv: null,
        scroll: 0,
        speed: 0,
        absSpeed: 0,
        touchDown: false
    }, vals);
    result.scope = scope;
    result.element = element;
    result.content = element.children();
    function setup() {
        element.css({
            overflow: "hidden"
        });
        if (scope.datagrid && element === scope.datagrid.element) {
            scope.$on(exports.datagrid.events.TOUCH_DOWN, onTouchStartNg);
        } else {
            result.content.bind(touchStart, onTouchStart);
        }
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
    function onTouchStartNg(evtType, event) {
        onTouchStart(event);
    }
    function onTouchStart(e) {
        if (!enabled) {
            return;
        }
        result.log("onTouchStart");
        stop();
        var touches = e.touches || e.originalEvent.touches;
        clearIntv();
        result.dispatch(exports.datagrid.events.BEFORE_VIRTUAL_SCROLL_START);
        if (touches[0] && touches[0].target && touches[0].target.tagName.match(/input|textarea|select/i)) {
            return;
        }
        max = element[0].scrollHeight;
        var touch = touches[0];
        _x = touch.pageX;
        _y = touch.pageY;
        values.touchDown = true;
        moved = false;
        stopEvent(e);
        stopCreep();
        updateBottom();
        addTouchEnd();
    }
    function stop() {
        clearTimeout(values.scrollingStopIntv);
        values.scrollingStopIntv = 0;
        result.onScrollingStop();
    }
    function stopCreep() {
        if (scope.datagrid) {
            scope.datagrid.creepRenderModel.stop();
        }
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
            } else if (enabled) {
                updateBottom();
                values.touchDown = false;
                _y = element[0].offsetTop + element[0].offsetHeight * .5;
                if (speed) {
                    values.speed = speed;
                    values.absSpeed = Math.abs(speed);
                }
                clearIntv();
                values.scrollingStopIntv = setTimeout(applyFriction);
            }
        }
        return enabled;
    };
    function addTouchEnd() {
        result.log("addTouchEnd");
        ux.each(result.content, function(el) {
            el.addEventListener(touchMove, onTouchMove, true);
            if (scope.datagrid && element === scope.datagrid.element) {
                result.log("	listen for TOUCH_UP");
                offTouchEnd = scope.$on(exports.datagrid.events.TOUCH_UP, onTouchEndNg);
            } else {
                result.log("	listen for touchend");
                el.addEventListener(touchEnd, onTouchEnd, true);
                el.addEventListener(touchCancel, onTouchEnd, true);
            }
        });
    }
    function removeTouchEnd() {
        result.log("removeTouchEnd");
        ux.each(result.content, function(el) {
            el.removeEventListener(touchMove, onTouchMove, true);
            if (offTouchEnd) {
                result.log("	remove TOUCH_UP");
                offTouchEnd();
                offTouchEnd = null;
            } else {
                result.log("	remove touchend");
                el.removeEventListener(touchEnd, onTouchEnd, true);
                el.removeEventListener(touchCancel, onTouchEnd, true);
            }
        });
    }
    function onTouchEndNg(evtStr, event) {
        onTouchEnd(event);
    }
    function onTouchEnd(event) {
        result.log("onTouchEnd");
        if (enabled) {
            values.touchDown = false;
            stopEvent(event);
            if (!moved) {
                fireClick(event);
            }
            removeTouchEnd();
            applyFriction();
        }
    }
    function onTouchMove(event) {
        if (enabled) {
            moved = true;
            stopEvent(event);
            var touch = event.changedTouches[0];
            updateScroll(touch.pageX, touch.pageY);
        }
    }
    function updateScroll(x, y) {
        var deltaX = _x + x, deltaY = _y - y;
        if (values.scroll + deltaY <= 0) {
            if (values.scroll) {
                result.dispatch(exports.datagrid.events.VIRTUAL_SCROLL_TOP, result, deltaY);
            }
            values.speed = -values.scroll;
            values.absSpeed = Math.abs(values.speed);
            values.scroll = deltaY = 0;
        } else if (values.scroll + deltaY >= bottom) {
            if (values.scroll !== bottom) {
                result.dispatch(exports.datagrid.events.VIRTUAL_SCROLL_BOTTOM, result, deltaY);
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
    function fireClick(e) {
        result.log("fireClick");
        var point = e.changedTouches ? e.changedTouches[0] : e, target, ev;
        clearTimeout(doubleTapTimer);
        doubleTapTimer = setTimeout(function() {
            doubleTapTimer = null;
            target = point.target;
            while (target.nodeType != 1) target = target.parentNode;
            if (target.tagName != "SELECT" && target.tagName != "INPUT" && target.tagName != "TEXTAREA") {
                ev = document.createEvent("MouseEvents");
                ev.initMouseEvent("click", true, true, e.view, 1, point.screenX, point.screenY, point.clientX, point.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, 0, null);
                ev._fake = true;
                target.dispatchEvent(ev);
            }
        }, 250);
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
            stop();
        }
    }
    function render() {
        var value = element[0].scrollTop - values.scroll;
        result.content.css({
            webkitTransform: "translate3d(0px, " + value + "px, 0px)"
        });
        result.dispatch(exports.datagrid.events.ON_VIRTUAL_SCROLL_UPDATE);
    }
    result.getScroll = function getScroll() {
        return values.scroll;
    };
    result.setScroll = function setScroll(value) {
        values.scroll = value;
        if (scope.datagrid) {
            scope.datagrid.values.scroll = value;
        }
    };
    result.scrollToBottom = function(immediately) {
        updateBottom();
        result.scrollTo(bottom, immediately);
    };
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
    result.scrollIntoView = scope.datagrid ? scope.datagrid.scrollModel.scrollIntoView : function() {};
    result.onScrollingStop = function onScrollingStop() {
        result.scrollTo(values.scroll, true);
    };
    result.destroy = function() {
        removeTouchEnd();
        element.unbind(touchStart, onTouchStart);
        result.destroyLogger();
        result = null;
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
            var values = vScroll.getValues();
            originalScrollModel.removeScrollListener();
            exp.values.scroll = values.scroll;
            exp.values.speed = values.speed;
            exp.values.absSpeed = values.absSpeed;
            originalScrollModel.scrollTo(value, immediately);
        });
        function onBeforeVirtualScrollStart(event) {
            var values = vScroll.getValues();
            ux.each(exp.values, function(value, key) {
                values[key] = value;
            });
        }
        exp.scope.$on(ux.datagrid.events.BEFORE_VIRTUAL_SCROLL_START, onBeforeVirtualScrollStart);
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
