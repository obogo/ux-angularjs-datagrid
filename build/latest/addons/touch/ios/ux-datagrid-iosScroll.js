/*
* uxDatagrid v.0.3.0-alpha
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
// ## <a name="virtualScroll">virtualScroll</a> ##
exports.datagrid.events.BEFORE_VIRTUAL_SCROLL_START = "virtualScroll:beforeScrollStart";

exports.datagrid.events.VIRTUAL_SCROLL_TOP = "virtualScroll:top";

exports.datagrid.events.VIRTUAL_SCROLL_BOTTOM = "virtualScroll:bottom";

exports.datagrid.events.ON_VIRTUAL_SCROLL_UPDATE = "virtualScroll:onUpdate";

// For simulating the scroll in IOS that doesn't have a smooth scroll natively using transform3d.
exports.datagrid.VirtualScroll = function VirtualScroll(scope, element, vals, updateValuesCallback, renderCallback) {
    var friction = .9, stopThreshold = .01, moved = false, transitionDuration = 100, result = exports.logWrapper("VirtualScroll", {}, "redOrange", function() {
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
        result.content.css({
            transitionTimingFunction: "ease-out"
        });
    }
    function wait(method, time) {
        var args = exports.util.array.toArray(arguments), intv;
        args.splice(0, 2);
        if (result.async) {
            intv = setTimeout(function() {
                method.apply(null, args);
            }, time);
        } else {
            method.apply(this, args);
        }
        return intv;
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
        clearIntv();
        updateValuesCallback(result.getValues());
        var touches = e.touches || e.originalEvent.touches;
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
    function waitToStop() {
        clearIntv();
        values.scrollingStopIntv = wait(stop, transitionDuration);
    }
    function stop() {
        clearIntv();
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
                values.scrollingStopIntv = wait(applyFriction);
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
    function updateScrollValues(x, y) {
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
            //result.cap(values.scroll + deltaY);
            values.absSpeed = Math.abs(deltaY);
        }
        //        console.log(values.speed);
        _y = y;
        _x = x;
    }
    function updateScroll(x, y) {
        updateScrollValues(x, y);
        if (!values.touchDown) {
            clearIntv();
            values.scrollingStopIntv = wait(applyFriction);
        }
        render();
    }
    function fireClick(e) {
        result.log("fireClick");
        var point = e.changedTouches ? e.changedTouches[0] : e, target, ev;
        clearTimeout(doubleTapTimer);
        //TODO: doubleTapTimer needs to be configurable to make clicks fire faster.
        doubleTapTimer = wait(function() {
            doubleTapTimer = null;
            // Find the last touched element
            target = point.target;
            while (target.nodeType != 1) target = target.parentNode;
            if (target.tagName != "SELECT" && target.tagName != "INPUT" && target.tagName != "TEXTAREA") {
                ev = document.createEvent("MouseEvents");
                ev.initMouseEvent("click", true, true, e.view, 1, point.screenX, point.screenY, point.clientX, point.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, 0, null);
                ev._fake = true;
                target.dispatchEvent(ev);
            }
        }, 1);
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
            var startScroll = values.scroll, dist, transDuration;
            while (values.absSpeed >= stopThreshold) {
                updateScrollValues(_x, _y - values.speed * friction);
            }
            dist = Math.abs(values.scroll - startScroll);
            transDuration = dist > transitionDuration ? dist : transitionDuration;
            render(transDuration);
            values.scrollingStopIntv = wait(applyFriction, transDuration);
            _startX = _endX = _startY = _endY = _startTime = _endTime = 0;
        } else {
            waitToStop();
        }
    }
    function render(tranDuration) {
        var value = element[0].scrollTop - values.scroll;
        result.content[0].style.transitionDuration = tranDuration ? tranDuration + "ms" : 0;
        result.content[0].style.webkitTransform = "translate3d(0px, " + value + "px, 0px)";
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
    result.async = true;
    /**
     * Scroll to the numeric value.
     * @param value
     * @param {Boolean=} immediately
     */
    result.scrollTo = function scrollTo(value, immediately) {
        render();
        renderCallback(value, immediately);
    };
    result.scrollIntoView = scope.datagrid ? scope.datagrid.scrollModel.scrollIntoView : function() {};
    /**
     * When it stops render.
     */
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

/*global ux */
// we want to override the default scrolling if it is an IOS device.
angular.module("ux").factory("iosScroll", function() {
    return function iosScroll(inst) {
        // do not let escape if in unit tests. exp.flow.async is false in unit tests.
        var vScroll, originalScrollModel = inst.scrollModel;
        if (!exports.datagrid.isIOS) {
            return inst;
        }
        vScroll = new ux.datagrid.VirtualScroll(inst.scope, inst.element, inst.values, function updateValues(values) {
            inst.values.scroll = values.scroll;
            inst.values.speed = values.speed;
            inst.values.absSpeed = values.absSpeed;
        }, function render(value, immediately) {
            inst.values.scroll = value;
            if (immediately) {
                originalScrollModel.onScrollingStop();
            } else {
                originalScrollModel.waitForStop();
            }
        });
        inst.scope.$on(ux.datagrid.events.ON_READY, function() {
            vScroll.content = inst.getContent();
            vScroll.setup();
            originalScrollModel.removeScrollListener();
        });
        vScroll.scrollToIndex = originalScrollModel.scrollToIndex;
        vScroll.scrollToItem = originalScrollModel.scrollToItem;
        inst.scrollModel = vScroll;
        return inst;
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
