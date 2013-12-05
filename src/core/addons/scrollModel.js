/*global ux */
exports.datagrid.coreAddons.push(function scrollModel(datagrid) {
    //TODO: need to implement scrollToIndex here.
    datagrid.setupScrolling = function setupScrolling() {
        datagrid.element[0].addEventListener('scroll', datagrid.onUpdateScroll);
        datagrid.unwatchers.push(function () {
            datagrid.element[0].removeEventListener('scroll', datagrid.onUpdateScroll);
        });
    };

    datagrid.onUpdateScroll = function onUpdateScroll(event) {
//        exp.flow.log("onUpdateScroll");
        var val = (event.target || event.srcElement || datagrid.element[0]).scrollTop;
        if (datagrid.values.scroll !== val) {
            datagrid.values.speed = val - datagrid.values.scroll;
            datagrid.values.absSpeed = Math.abs(datagrid.values.speed);
            datagrid.values.scroll = val;
        }
        datagrid.waitForStop();
    };

    datagrid.scrollTo = function scrollTo(value) {
        datagrid.element[0].scrollTop = value;
        datagrid.waitForStop();
    };

    datagrid.waitForStop = function waitForStop() {
//        exp.flow.log("waitForStop");
        clearTimeout(datagrid.values.scrollingStopIntv);
        datagrid.values.scrollingStopIntv = setTimeout(datagrid.onScrollingStop, datagrid.options.updateDelay);
    };

    datagrid.onScrollingStop = function onScrollingStop() {
        datagrid.flow.log("scrollingStop");
        datagrid.values.speed = 0;
        datagrid.values.absSpeed = 0;
        datagrid.flow.add(datagrid.render);
    };
});