exports.datagrid.events.AFTER_SCROLL_HISTORY_INIT_SCROLL = "datagrid:afterScrollHistoryInitScroll";
// <a name="scrollHistoryModel">scrollHistoryModel</a> is a singleton that stores the values of all datagrids
// that have the scrollHistory implemented. So that as a grid gets destroyed, the history persists so when that
// grid gets reconstructed at that same path, it will pull from the history that matches that path.
angular.module('ux').service('scrollHistoryModel', ['$location', '$rootScope', function ($location, $rootScope) {
    var cache = {};// cache is persistent until application reloads.
    exports.datagrid.scrollHistory = (function scrollHistory() {
        var result = exports.logWrapper('scrollHistoryModel', {}, 'orange', function () {
            $rootScope.$emit.apply($rootScope, arguments);
        });

        // <a name="getPath">getPath</a> get the location of the url to store the scroll history at.
        function getPath() {
            return $location.path();
        }

        // <a name="storeScroll">storeScroll</a> store the scroll value at the key path given.
        function storeScroll(path, scroll) {
            cache[path] = scroll;
            result.log("storeScroll %s = %s", path, scroll);
        }

        // <a name="getCurrentScroll">getCurrentScroll</a> get the stored value of the current path.
        function getCurrentScroll() {
            return result.getScroll(result.getPath());
        }

        // <a name="getScroll">getScroll</a> get the stored value of the specified path.
        function getScroll(path) {
            return cache[path] || 0;
        }

        // <a name="clearPath">clearPath</a> clear the stored value for the specified path.
        function clearPath(path) {
            result.log("clearPath %s", path);
            delete cache[path];
        }

        // <a name="clear">clear</a> clear all stored values
        function clear() {
            result.log("clear all stored values");
            cache = {};
        }

        result.getPath = getPath;
        result.getCurrentScroll = getCurrentScroll;
        result.getScroll = getScroll;
        result.storeScroll = storeScroll;
        result.clearPath = clearPath;
        result.clear = clear;
        return result;
    }());
    return exports.datagrid.scrollHistory;
}]);

// <a name="scrollHistory">scrollHistory</a> the scrollHistory instance that gets added to the datagrid as an addon.
// it implements the same api as the global one because all methods map to it. This just allows it to be used as an
// addon but it is still a singleton for the values that are stored and keep the listeners stored just for the addon
// instance.
angular.module('ux').factory('scrollHistory', function () {

    return function (exp, scrollHistoryModel) {
        var result = exports.logWrapper('scrollHistory', {}, 'green', exp.dispatch);
        // map methods from singleton to addon instance.
        result.getPath = scrollHistoryModel.getPath;

        // <a name="storeCurrentScroll">storeCurrentScroll</a> store the current scroll of the datagrid based
        // on the current url path.
        result.storeCurrentScroll = function storeCurrentScroll() {
            result.storeScroll(result.getPath(), exp.values.scroll);
        };
        result.storeScroll = scrollHistoryModel.storeScroll;
        result.getCurrentScroll = scrollHistoryModel.getCurrentScroll;
        result.getScroll = scrollHistoryModel.getScroll;
        result.clearPath = scrollHistoryModel.clearPath;

        result.destroy = function destroy() {
            scrollHistoryModel = null;
            result = null;
            exp = null;
        };

        // watch only once to have it start at that scrolling position on startup.
        var unwatch = exp.scope.$on(exports.datagrid.events.ON_RENDER_AFTER_DATA_CHANGE, function () {
            result.log("found scrollHistory so scrollTo %s", result.getCurrentScroll());
            exp.scrollModel.scrollTo(result.getCurrentScroll(), true);
            // remove the listener. So that it will only have been captured once.
            unwatch();
            unwatch = null;
            exp.dispatch(exports.datagrid.events.AFTER_SCROLL_HISTORY_INIT_SCROLL);
        });

        // add the listener to the main unwatchers array to make sure it gets cleaned up later before the destroy to
        // keep events from firing during the destroy process.
        exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.ON_AFTER_UPDATE_WATCHERS, function () {
            if (!unwatch) {
                result.storeCurrentScroll();// this can be overridden if necessary.
            }
        }));

        exp.scrollHistory = result;
        return exp;
    };
});