/*global */
//TODO: this is not updating correctly when jumping to sections in the scroller.
angular.module('ux').factory('iosScrollFrictionAddon', function () {
    return function (listView) {
        var exp = listView, values = exp.values, flow = exp.flow,
            friction = 0.95, stopThreshold = 1,
            iOS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );

        // this addon is for ios devices only. Android devices have scroll friction by default.
        if (iOS) {
            exp.setupScrolling = function setupScrolling() {
                flow.log("scrollFriction:setupScrolling");
                exp.options.updateDelay = 10;
                exp.element[0].addEventListener('scroll', exp.onUpdateScroll);
                exp.unwatchers.push(function () {
                    exp.element[0].removeEventListener('scroll', exp.onUpdateScroll);
                });
            };

            exp.onUpdateScroll = function onUpdateScroll(event) {
                flow.log("scrollFriction:onUpdateScroll");
                var val = (event.target || event.srcElement || exp.element[0]).scrollTop;
                if (values.scroll !== val) {
                    values.speed = val - values.scroll;
                    values.absSpeed = Math.abs(values.speed);
                    values.scroll = val;
                }
                exp.waitForStop();
            };

            exp.scrollTo = function scrollTo(value) {
                exp.element[0].scrollTop = value;
                exp.waitForStop();
            };

            exp.waitForStop = function waitForStop() {
                flow.log("scrollFriction:waitForStop");
                clearTimeout(values.scrollingStopIntv);
                values.scrollingStopIntv = setTimeout(exp.onScrollingStop, exp.options.updateDelay);
            };

            exp.onScrollingStop = function onScrollingStop() {
                flow.log("scrollFriction:scrollingStop");
                if (values.absSpeed > stopThreshold) {
                    exp.applyScrollFriction();
                } else {
                    values.speed = 0;
                    values.absSpeed = 0;
                    flow.add(exp.render);
                }
            };

            exp.applyScrollFriction = function applyScrollFriction() {
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