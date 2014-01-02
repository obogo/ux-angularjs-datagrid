/*global ux */
// we want to override the default scrolling if it is an IOS device.
angular.module('ux').factory('iosScroll', function () {

    return function iosScroll(exp) {
        // do not let escape if in unit tests. exp.flow.async is false in unit tests.
        var vScroll, originalScrollModel = exp.scrollModel;
        if (exp.flow.async && !navigator.userAgent.match(/(iPad|iPhone|iPod)/g)) {
            return exp;
        }
        vScroll = new ux.datagrid.VirtualScroll(exp.scope, exp.element, exp.values, function (value, immediately) {
            vScroll.clear();
            exp.values.scroll = vScroll.values.scroll;
            exp.values.speed = vScroll.values.speed;
            exp.values.absSpeed = vScroll.values.absSpeed;
            originalScrollModel.scrollTo(value, immediately);
        });
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