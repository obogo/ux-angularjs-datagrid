/**
 * Datagrid infinite scroll adds more data when the list scrolls to the bottom.
 * @type {string}
 */
ux.datagrid.events.ON_SCROLL_TO_TOP = "datagrid:onScrollToTop";
ux.datagrid.events.ON_SCROLL_TO_BOTTOM = 'datagrid:onScrollToBottom';
angular.module('ux').factory('infiniteScroll', function () {
    return function infiniteScroll(inst, $filter) {
        var result = {}, bottomOffset = 0, scrollOffset = 0, loadingRow = {_template: 'loadingRow'};

        inst.options.infiniteScroll = inst.options.infiniteScroll || {};
        inst.options.infiniteScroll.enable = inst.options.infiniteScroll.enable === undefined ? true : inst.options.infiniteScroll.enable;
        inst.options.infiniteScroll.limit = inst.options.infiniteScroll.limit === undefined ? 0 : inst.options.infiniteScroll.limit;

        result.onBeforeDataChange = function (event, newVal, oldVal) {
            if (inst.options.infiniteScroll.enable) {
                if (inst.options.infiniteScroll.limit && newVal.length < inst.options.infiniteScroll.limit) {
                    event.newValue = $filter('limitTo')(newVal, inst.options.infiniteScroll.limit);
                    event.preventDefault();
                    result.addExtraRow(event.newValue);
                }
            }
        };

        result.addExtraRow = function (data) {
            scrollOffset = inst.values.scroll;
            if (data[data.length - 1] !== loadingRow) {
                data.push(loadingRow);
            }
        };

        result.calculateBottomOffset = function calculateBottomOffset() {
            if (inst.rowsLength) {
                var i = inst.rowsLength - 1;
                bottomOffset = (inst.getRowOffset(i) - inst.getViewportHeight()) + inst.getRowHeight(i);
                inst.scrollModel.scrollTo(scrollOffset, true);
            }
        };

        result.onUpdateScroll = function onUpdateScroll(event, scroll) {
            if (scroll >= bottomOffset) {
                inst.dispatch(ux.datagrid.events.ON_SCROLL_TO_BOTTOM);
            } else if (scroll <= 0) {
                inst.dispatch(ux.datagrid.events.ON_SCROLL_TO_TOP);
            }
        };


        inst.unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_BEFORE_DATA_CHANGE, result.onBeforeDataChange));
//        inst.unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_AFTER_DATA_CHANGE, result.afterDataChange));
        inst.unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_RENDER_AFTER_DATA_CHANGE, result.calculateBottomOffset));
        inst.unwatchers.push(inst.scope.$on(ux.datagrid.events.SCROLL_STOP, result.onUpdateScroll));

        inst.infiniteScroll = result;
    };
});