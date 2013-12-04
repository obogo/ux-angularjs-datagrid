/*global ux */
ux.listView.coreAddons.push(function scrollModel(exports) {
    //TODO: need to implement scrollToIndex here.
    exports.setupScrolling = function setupScrolling() {
        exports.element[0].addEventListener('scroll', exports.onUpdateScroll);
        exports.unwatchers.push(function () {
            exports.element[0].removeEventListener('scroll', exports.onUpdateScroll);
        });
    };

    exports.onUpdateScroll = function onUpdateScroll(event) {
//        exports.flow.log("onUpdateScroll");
        var val = (event.target || event.srcElement || exports.element[0]).scrollTop;
        if (exports.values.scroll !== val) {
            exports.values.speed = val - exports.values.scroll;
            exports.values.absSpeed = Math.abs(exports.values.speed);
            exports.values.scroll = val;
        }
        exports.waitForStop();
    };

    exports.scrollTo = function scrollTo(value) {
        exports.element[0].scrollTop = value;
        exports.waitForStop();
    };

    exports.waitForStop = function waitForStop() {
//        exports.flow.log("waitForStop");
        clearTimeout(exports.values.scrollingStopIntv);
        exports.values.scrollingStopIntv = setTimeout(exports.onScrollingStop, exports.options.updateDelay);
    };

    exports.onScrollingStop = function onScrollingStop() {
        exports.flow.log("scrollingStop");
        exports.values.speed = 0;
        exports.values.absSpeed = 0;
        exports.flow.add(exports.render);
    };
});