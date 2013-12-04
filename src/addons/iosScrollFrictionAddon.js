/*global */
(function () {
    'use strict';
//TODO: this is not updating correctly when jumping to sections in the scroller.
    angular.module('ux').factory('iosScrollFrictionAddon', function () {
        return function (listView) {
            var exports = listView, values = exports.values, flow = exports.flow,
                friction = 0.95, stopThreshold = 1,
                iOS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );

            // this addon is for ios devices only. Android devices have scroll friction by default.
            if (iOS) {
                exports.setupScrolling = function setupScrolling() {
                    flow.log("scrollFriction:setupScrolling");
                    exports.options.updateDelay = 10;
                    exports.element[0].addEventListener('scroll', exports.onUpdateScroll);
                    exports.unwatchers.push(function () {
                        exports.element[0].removeEventListener('scroll', exports.onUpdateScroll);
                    });
                };

                exports.onUpdateScroll = function onUpdateScroll(event) {
                    flow.log("scrollFriction:onUpdateScroll");
                    var val = (event.target || event.srcElement || exports.element[0]).scrollTop;
                    if (values.scroll !== val) {
                        values.speed = val - values.scroll;
                        values.absSpeed = Math.abs(values.speed);
                        values.scroll = val;
                    }
                    exports.waitForStop();
                };

                exports.scrollTo = function scrollTo(value) {
                    exports.element[0].scrollTop = value;
                    exports.waitForStop();
                };

                exports.waitForStop = function waitForStop() {
                    flow.log("scrollFriction:waitForStop");
                    clearTimeout(values.scrollingStopIntv);
                    values.scrollingStopIntv = setTimeout(exports.onScrollingStop, exports.options.updateDelay);
                };

                exports.onScrollingStop = function onScrollingStop() {
                    flow.log("scrollFriction:scrollingStop");
                    if (values.absSpeed > stopThreshold) {
                        exports.applyScrollFriction();
                    } else {
                        values.speed = 0;
                        values.absSpeed = 0;
                        flow.add(exports, exports.render);
                    }
                };

                exports.applyScrollFriction = function applyScrollFriction() {
                    var value = 0;
                    if (values.absSpeed > stopThreshold) {
                        value = values.speed * friction;
                    }
                    if (value) {
                        listView.element[0].scrollTop += value;
                    }
                };
            }

        };
    });

}());