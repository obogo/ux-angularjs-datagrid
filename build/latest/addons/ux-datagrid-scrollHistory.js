/*!
* ux-angularjs-datagrid v.1.6.8
* (c) 2018, Obogo
* https://github.com/obogo/ux-angularjs-datagrid
* License: MIT.
*/
(function (exports, global) {
if (typeof define === "function" && define.amd) {
  define(exports);
} else if (typeof module !== "undefined" && module.exports) {
  module.exports = exports;
} else {
  global.ux = exports;
}

exports.datagrid.events.AFTER_SCROLL_HISTORY_INIT_SCROLL = "datagrid:afterScrollHistoryInitScroll";

/**
 * ##<a name="scrollHistoryModel">scrollHistoryModel</a>##
 * is a singleton that stores the values of all datagrids that have the scrollHistory implemented.
 * So that as a grid gets destroyed, the history persists so when that grid gets reconstructed at
 * that same path, it will pull from the history that matches that path.
 */
angular.module("ux").service("scrollHistoryModel", [ "$location", "$rootScope", function($location, $rootScope) {
    var cache = {};
    // cache is persistent until application reloads.
    exports.datagrid.scrollHistory = function scrollHistory() {
        var result = exports.logWrapper("scrollHistoryModel", {}, "orange", function() {
            exports.util.apply($rootScope.$emit, $rootScope, arguments);
        });
        /**
         * ###<a name="getPath">getPath</a>###
         * get the location of the url to store the scroll history at.
         * @returns {*}
         */
        function getPath() {
            // it should get the url with the params. if the params are different scroll history should be different.
            return $location.url();
        }
        /**
         * ###<a name="storeScroll">storeScroll</a>###
         * store the scroll value at the key path given.
         * @param {String} path
         * @param {Number} scroll
         */
        function storeScroll(path, scroll) {
            cache[path] = scroll;
            result.log("storeScroll %s = %s", path, scroll);
        }
        /**
         * ###<a name="getCurrentScroll">getCurrentScroll</a>###
         * get the stored value of the current path.
         * @params {String=} path
         * @returns {*}
         */
        function getCurrentScroll(path) {
            return result.getScroll(path || result.getPath());
        }
        /**
         * ###<a name="getScroll">getScroll</a>### get the stored value of the specified path.
         * @param {String} path
         * @returns {*|number}
         */
        function getScroll(path) {
            return cache[path] || 0;
        }
        /**
         * ###<a name="clearPath">clearPath</a>###
         * clear the stored value for the specified path.
         * @param {String} path
         */
        function clearPath(path) {
            path = path || getPath();
            result.log("clearPath %s", path);
            delete cache[path];
        }
        /**
         * ###<a name="clear">clear</a>### clear all stored values
         */
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
    }();
    return exports.datagrid.scrollHistory;
} ]);

/**
 * ##<a name="scrollHistory">scrollHistory</a>## the scrollHistory instance that gets added to the datagrid as an addon.
 * it implements the same api as the global one because all methods map to it. This just allows it to be used as an
 * addon but it is still a singleton for the values that are stored and keep the listeners stored just for the addon
 * instance.
 */
angular.module("ux").factory("scrollHistory", function() {
    return [ "inst", "scrollHistoryModel", function(inst, scrollHistoryModel) {
        var result = exports.logWrapper("scrollHistory", {}, "blue", inst), ready, path = inst.options.scrollHistory && inst.options.scrollHistory.path || "", scrollPos, waitingForAfterDataChange = false, unwatchers = [];
        if (inst.options.scrollHistory && inst.options.scrollHistory.ignoreParams) {
            path = scrollHistoryModel.getPath().split("?").shift();
        }
        // map methods from singleton to addon instance.
        result.getPath = path ? function() {
            return path;
        } : scrollHistoryModel.getPath;
        /**
         * ###<a name="storeCurrentScroll">storeCurrentScroll</a>###
         * store the current scroll of the datagrid based on the current url path.
         */
        result.storeCurrentScroll = function storeCurrentScroll() {
            result.storeScroll(result.getPath(), inst.values.scroll);
        };
        result.storeScroll = scrollHistoryModel.storeScroll;
        result.getCurrentScroll = path ? function() {
            return scrollHistoryModel.getCurrentScroll(path);
        } : scrollHistoryModel.getCurrentScroll;
        result.getScroll = scrollHistoryModel.getScroll;
        result.clearPath = scrollHistoryModel.clearPath;
        result.setScrollValue = function() {
            scrollPos = result.getCurrentScroll();
            inst.scrollModel.setScroll(scrollPos);
        };
        result.setScroll = function(value) {
            scrollHistoryModel.storeScroll(result.getPath(), value);
        };
        /**
         * ###<a name="isComplete">isComplete</a>###
         * Tell weather the scrollHistory is still processing or if it is complete.
         * @returns {boolean}
         */
        result.isComplete = function() {
            if (scrollPos === undefined) {
                result.setScrollValue();
            }
            return scrollPos === 0;
        };
        /**
         * ###<a name="scroll">scroll</a>###
         * The only time we need to set the actual scrollTo is when the history is invalid. As in it wants to
         * scroll to a value that is taller than the data will support. In that case it will scroll to 0.
         */
        result.scroll = function() {
            if (inst.getContentHeight() - inst.getViewportHeight() < scrollPos && inst.values.scroll) {
                result.log("\tscrollTo 0 because scroll %s is too tall for the content", scrollPos);
                inst.scrollModel.setScroll(0);
                inst.scrollModel.scrollTo(0, true);
            }
        };
        /**
         * watch only once to have it start at that scrolling position on startup.
         */
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_HEIGHTS_UPDATED, function() {
            result.log("found scrollHistory so scrollTo %s", result.getCurrentScroll());
            // need to set the scroll before the data is changed.
            ready = true;
            result.setScrollValue();
            waitingForAfterDataChange = true;
            unwatchers.shift()();
        }));
        /**
         * we then need to scroll to after the render because otherwise the content isn't able to set
         * the scroll top value because the content doesn't have a height yet.
         */
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_RENDER_AFTER_DATA_CHANGE, function() {
            if (inst.getContentHeight()) {
                result.log("onRenderAfterDataChange");
                waitingForAfterDataChange = false;
                result.scroll();
                if (!inst.scrollModel.iScroll) {
                    inst.dispatch(exports.datagrid.events.AFTER_SCROLL_HISTORY_INIT_SCROLL);
                }
                unwatchers.shift()();
            } else {
                result.log("onRenderAfterDataChange skipped because there is no contentHeight");
            }
        }));
        /**
         * add the listener to the main unwatchers array to make sure it gets cleaned up later before the destroy to
         * keep events from firing during the destroy process.
         */
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_UPDATE_WATCHERS, function() {
            if (ready && !waitingForAfterDataChange) {
                scrollPos = 0;
                result.storeCurrentScroll();
            }
        }));
        result.destroy = function() {
            while (unwatchers.length) {
                unwatchers.pop()();
            }
            inst.scrollHistory = null;
            result = null;
            inst = null;
            scrollHistoryModel = null;
        };
        inst.scrollHistory = result;
        return inst;
    } ];
});
}(this.ux = this.ux || {}, function() {return this;}()));
