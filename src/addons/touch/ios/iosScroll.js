/*global ux */
// we want to override the default scrolling if it is an IOS device.
angular.module('ux').factory('iosScroll', function () {

    return function iosScroll(exp) {
        // do not let escape if in unit tests. exp.flow.async is false in unit tests.
        var vScroll, originalScrollModel = exp.scrollModel;
        if (!exports.datagrid.isIOS) {
            return exp;
        }
        vScroll = new ux.datagrid.VirtualScroll(exp.scope, exp.element, exp.values, function (value, immediately) {
            vScroll.clear();
            var values = vScroll.getValues();
            originalScrollModel.removeScrollListener();
            exp.values.scroll = values.scroll;
            exp.values.speed = values.speed;
            exp.values.absSpeed = values.absSpeed;
            originalScrollModel.scrollTo(value, immediately);
        });
        function onBeforeVirtualScrollStart(event) {
            // update the virtual scroll values to reflect what is in the datagrid.
            var values = vScroll.getValues();
            ux.each(exp.values, function (value, key) {
                values[key] = value;
            });
        }
        exp.scope.$on(ux.datagrid.events.BEFORE_VIRTUAL_SCROLL_START, onBeforeVirtualScrollStart);
        exp.scope.$on(ux.datagrid.events.READY, function () {
            vScroll.content = exp.getContent();
            vScroll.setup();
        });
        vScroll.scrollToIndex = originalScrollModel.scrollToIndex;
        vScroll.scrollToItem = originalScrollModel.scrollToItem;
        exp.scrollModel = vScroll;
        return exp;
    };
});