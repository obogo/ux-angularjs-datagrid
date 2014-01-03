exports.datagrid.events.AFTER_SCROLL_HISTORY_INIT_SCROLL = "datagrid:afterScrollHistoryInitScroll";
angular.module('ux').factory('scrollHistory', ['$location', function ($location) {

    var cache = {};// cache is persistent until application reloads.

    return function scrollHistory(exp) {
        var result = {}, unwatch;

        function getPath() {
            return $location.path();
        }

        function storeCurrentScroll() {
            result.storeScroll(result.getPath(), exp.values.scroll);
        }

        function storeScroll(path, scroll) {
            cache[path] = scroll;
            exp.flow.log('store %s = %s', path, scroll);
        }

        function getCurrentScroll() {
            return result.getScroll(result.getPath());
        }

        function getScroll(path) {
            return cache[path] || 0;
        }

        result.getPath = getPath;
        result.getCurrentScroll = getCurrentScroll;
        result.getScroll = getScroll;
        result.storeCurrentScroll = storeCurrentScroll;
        result.storeScroll = storeScroll;

        // watch only once to have it start at that scrolling position on startup.
        unwatch = exp.scope.$on(exports.datagrid.events.RENDER_AFTER_DATA_CHANGE, function () {
            exp.scrollModel.scrollTo(result.getCurrentScroll(), true);
            unwatch();
            unwatch = null;
            exp.dispatch(exports.datagrid.events.AFTER_SCROLL_HISTORY_INIT_SCROLL);
        });

        exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.AFTER_UPDATE_WATCHERS, function () {
            if (!unwatch) {
                result.storeCurrentScroll();// just this can be overridden if necessary.
            }
        }));

        exp.scrollHistory = result;
        return exp;
    };
}]);