/**
 * Datagrid infinite scroll adds more data when the list scrolls to the bottom.
 * @type {string}
 */
ux.datagrid.events.SCROLL_TO_TOP = "datagrid:scrollToTop";
ux.datagrid.events.SCROLL_TO_BOTTOM = 'datagrid:scrollToBottom';
angular.module('ux').factory('infiniteScroll', function () {
    return function (exp) {
        var result = {}, bottomOffset = 0, scrollOffset = 0, loadingRow = {_template:'loadingRow'};

        result.beforeDataChange = function beforeDataChange() {
            scrollOffset = exp.values.scroll;
            if (exp.data[exp.data.length - 1] !== loadingRow && (!exp.options.infiniteScrollLimit || exp.data.length < exp.options.infiniteScrollLimit)) {
                exp.data.push(loadingRow);
            }
        };

        result.calculateBottomOffset = function calculateBottomOffset() {
            if (exp.rowsLength) {
                var i = exp.rowsLength - 1;
                bottomOffset = (exp.getRowOffset(i) - exp.getViewportHeight()) + exp.getRowHeight(i);
                exp.scrollModel.scrollTo(scrollOffset, true);
            }
        };

        result.onUpdateScroll = function onUpdateScroll(event, scroll) {
            if (scroll >= bottomOffset) {
                exp.dispatch(ux.datagrid.events.SCROLL_TO_BOTTOM);
            } else if (scroll <= 0) {
                exp.dispatch(ux.datagrid.events.SCROLL_TO_TOP);
            }
        };

        exp.unwatchers.push(exp.scope.$on(ux.datagrid.events.AFTER_DATA_CHANGE, result.beforeDataChange));
        exp.unwatchers.push(exp.scope.$on(ux.datagrid.events.RENDER_AFTER_DATA_CHANGE, result.calculateBottomOffset));
        exp.unwatchers.push(exp.scope.$on(ux.datagrid.events.SCROLL_STOP, result.onUpdateScroll));

        exp.infiniteScroll = result;
    };
});