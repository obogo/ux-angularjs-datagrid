/*global ux */
// we want to override the default scrolling if it is an IOS device.
angular.module('ux').factory('iosScroll', function () {

    return function iosScroll(exp) {
        if (!navigator.userAgent.match(/(iPad|iPhone|iPod)/g)) {
            return exp;
        }
        //TODO: this needs to be updated later so that x is used to scroll horizontally.
        var originalScrollModel = exp.scrollModel,
            friction = 0.95, stopThreshold = 0.05, result = {}, _x = 0, _y = 0, max,
            touchStart = 'touchstart', touchEnd = 'touchend', touchMove = 'touchmove', touchCancel = 'touchCancel';

        function setup() {
            exp.element.css({overflow: 'hidden'});
            exp.getContent().on(touchStart, onTouchStart);
        }

        function clearIntv() {
            clearTimeout(exp.values.scrollingStopIntv);
            exp.values.scrollingStopIntv = 0;
        }

        function onTouchStart(e) {
            clearIntv();
            if (e.touches[0] && e.touches[0].target && e.touches[0].target.tagName.match(/input|textarea|select/i)) {
                return;
            }
            max = exp.getContentHeight() - exp.getViewportHeight();
            var touch = e.touches[0];
            _x = touch.pageX;
            _y = touch.pageY;
            exp.values.touchDown = true;
            e.preventDefault();
            e.stopPropagation();
            addTouchEnd();
        }

        function addTouchEnd() {
            exp.getContent().on(touchMove, onTouchMove);
            exp.getContent().on(touchEnd, onTouchEnd);
            exp.getContent().on(touchCancel, onTouchEnd);
        }

        function removeTouchEnd() {
            exp.getContent().off(touchMove, onTouchMove);
            exp.getContent().off(touchEnd, onTouchEnd);
            exp.getContent().off(touchCancel, onTouchEnd);
        }

        function onTouchEnd(event) {
            exp.values.touchDown = false;
            event.preventDefault();
            event.stopPropagation();
            removeTouchEnd();
            applyFriction();
        }

        function onTouchMove(event) {
            event.preventDefault();
            event.stopPropagation();
            var touch = event.changedTouches[0];
            updateScroll(touch.pageX, touch.pageY);
        }

        function updateScroll(x, y) {
            var deltaX = _x + x, deltaY = _y - y;
            if (exp.values.scroll + deltaY < 0) {
                exp.values.scroll = deltaY = _y = y = 0;
            }
            if (exp.values.scroll + deltaY > max) {
                exp.values.scroll = _y = y = max;
                deltaY = 0;
            }
            exp.values.speed = deltaY;
            exp.values.scroll += deltaY;
            exp.values.absSpeed = Math.abs(deltaY);
            _y = y;
            _x = x;
            render();
            if (!exp.values.touchDown) {
                clearIntv();
                exp.values.scrollingStopIntv = setTimeout(applyFriction);
            }
        }

        function applyFriction() {
            if (exp.values.absSpeed >= stopThreshold) {
                updateScroll(_x, _y - exp.values.speed * friction);
            } else {
                result.onScrollingStop();
            }
        }

        function render() {
            var value = exp.element[0].scrollTop - exp.values.scroll;
            exp.getContent().css({webkitTransform: "translate3d(0px, " + value + "px, 0px)"});
        }

        function clearRender() {
            exp.getContent().css({webkitTransform: ""});
        }

        /**
         * When it stops render.
         */
        result.onScrollingStop = function onScrollingStop() {
            result.scrollTo(exp.values.scroll, true);
        };

        /**
         * Scroll to the numeric value.
         * @param value
         * @param {Boolean=} immediately
         */
        result.scrollTo = function scrollTo(value, immediately) {
            console.log('updateScroll');
            clearRender();
            originalScrollModel.scrollTo(Math.abs(value), true);
        };

        function destroy() {
            clearIntv();
            exp.getContent().off(touchStart, onTouchStart);
            removeTouchEnd();
            originalScrollModel.destroy();
            result = null;
            exp = null;
            originalScrollModel = null;
        }

        result.destory = destroy;

        originalScrollModel.removeTouchEvents(); // remove the events
        exp.scrollModel = result;
        exp.scope.$on(ux.datagrid.events.READY, setup);

        return exp;
    };
});