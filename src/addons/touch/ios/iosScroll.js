/*global ux */
// we want to override the default scrolling if it is an IOS device.
angular.module('ux').factory('iosScroll', function () {

    return function iosScroll(exp) {
        // do not let escape if in unit tests. exp.flow.async is false in unit tests.
        var vScroll, originalScrollModel = exp.scrollModel;
        if (!exports.datagrid.isIOS) {
            return exp;
        }
        vScroll = new ux.datagrid.VirtualScroll(
            exp.scope,
            exp.element,
            exp.values,
            function updateValues(values) {
                exp.values.scroll = values.scroll;
                exp.values.speed = values.speed;
                exp.values.absSpeed = values.absSpeed;
            },
            function render(value, immediately) {
                exp.values.scroll = value;
                if (immediately) {
                    originalScrollModel.onScrollingStop();
                } else {
                    originalScrollModel.waitForStop();
                }
            }
        );
        exp.scope.$on(ux.datagrid.events.ON_READY, function () {
            vScroll.content = exp.getContent();
            vScroll.setup();
            originalScrollModel.removeScrollListener();
        });
        vScroll.scrollToIndex = originalScrollModel.scrollToIndex;
        vScroll.scrollToItem = originalScrollModel.scrollToItem;
        exp.scrollModel = vScroll;
        return exp;
    };
});