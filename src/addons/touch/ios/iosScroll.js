/*global ux */
// we want to override the default scrolling if it is an IOS device.
angular.module('ux').factory('iosScroll', function () {

    return function iosScroll(inst) {
        // do not let escape if in unit tests. exp.flow.async is false in unit tests.
        var vScroll, originalScrollModel = inst.scrollModel;
        if (!exports.datagrid.isIOS) {
            return inst;
        }
        vScroll = new ux.datagrid.VirtualScroll(
            inst.scope,
            inst.element,
            inst.values,
            function updateValues(values) {
                inst.values.scroll = values.scroll;
                inst.values.speed = values.speed;
                inst.values.absSpeed = values.absSpeed;
            },
            function render(value, immediately) {
                inst.values.scroll = value;
                if (immediately) {
                    originalScrollModel.onScrollingStop();
                } else {
                    originalScrollModel.waitForStop();
                }
            }
        );
        inst.scope.$on(ux.datagrid.events.ON_READY, function () {
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