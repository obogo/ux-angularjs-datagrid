/*global ux */
exports.listView.coreAddons.push(function scrollModel(exp) {
    //TODO: need to implement scrollToIndex here.
    exp.setupScrolling = function setupScrolling() {
        exp.element[0].addEventListener('scroll', exp.onUpdateScroll);
        exp.unwatchers.push(function () {
            exp.element[0].removeEventListener('scroll', exp.onUpdateScroll);
        });
    };

    exp.onUpdateScroll = function onUpdateScroll(event) {
//        exp.flow.log("onUpdateScroll");
        var val = (event.target || event.srcElement || exp.element[0]).scrollTop;
        if (exp.values.scroll !== val) {
            exp.values.speed = val - exp.values.scroll;
            exp.values.absSpeed = Math.abs(exp.values.speed);
            exp.values.scroll = val;
        }
        exp.waitForStop();
    };

    exp.scrollTo = function scrollTo(value) {
        exp.element[0].scrollTop = value;
        exp.waitForStop();
    };

    exp.waitForStop = function waitForStop() {
//        exp.flow.log("waitForStop");
        clearTimeout(exp.values.scrollingStopIntv);
        exp.values.scrollingStopIntv = setTimeout(exp.onScrollingStop, exp.options.updateDelay);
    };

    exp.onScrollingStop = function onScrollingStop() {
        exp.flow.log("scrollingStop");
        exp.values.speed = 0;
        exp.values.absSpeed = 0;
        exp.flow.add(exp.render);
    };
});