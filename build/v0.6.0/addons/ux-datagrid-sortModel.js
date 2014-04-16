/*
* uxDatagrid v.0.6.0
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
exports.datagrid.events.ON_BEFORE_SORT = "datagrid:onBeforeSort";

exports.datagrid.events.ON_AFTER_SORT = "datagrid:onAfterSort";

angular.module("ux").service("sortStatesModel", [ "$location", "$rootScope", function($location, $rootScope) {
    /**************************************************************************************
     * ##<a name="sortStatesModel">sortStatesModel</a>##
     * ColumnStates for sorting. Singleton.
     * Keeps track of weather a column is sorted or not.
     * It persists based on the path.
     * @type {Object}
     **************************************************************************************/
    exports.datagrid.sortStatesModel = function() {
        var result = exports.logWrapper("columnSortStatesModel", {}, "blue", function() {
            $rootScope.$emit.apply($rootScope, arguments);
        }), sortOptions = {
            ASC: "asc",
            DESC: "desc",
            NONE: "none"
        }, lastPath = "", states = {}, multipleStates = {}, ignoreParamsInPath = {}, /**
             * The default of weather multiple states are allowed or not.
             * @type {Boolean}
             */
        defaultAllowMultipleStates = false;
        /**
         * ###<a name="isPrivate">isPrivate</a>###
         * @param {String} prop
         * @returns {boolean}
         */
        function isPrivate(prop) {
            return prop.charAt(0) === "$";
        }
        /**
         * ###<a name="getCurrentPath">getCurrentPath</a>###
         * Get the whole url as a key to store the scroll value against.
         * @returns {*}
         */
        function getCurrentPath() {
            return $location.path();
        }
        /**
         * ###<a name="getCurrentPathWithoutParams">getCurrentPathWithoutParams</a>###
         * Return just the url without any GET/Search params.
         * @returns {*}
         */
        function getCurrentPathWithoutParams() {
            return getCurrentPath().split("?").shift();
        }
        /**
         * ###<a name="getPath">getPath</a>###
         * @return {string}
         */
        function getPath() {
            var path;
            if (getIgnoreParamsInPath()) {
                path = getCurrentPathWithoutParams();
            } else {
                path = getCurrentPath();
            }
            if (path !== lastPath) {
                result.log("getPath changed from %s to %s", lastPath, path);
                lastPath = path;
            }
            return path;
        }
        /**
         * ###<a name="getAllowMultipleStates">getAllowMultipleStates</a>###
         * Check for allowing of multipleStates on a per path basis or
         * fall back on the defaultAllowMultipleStates
         * @return {Boolean}
         */
        function getAllowMultipleStates() {
            var result = multipleStates[getPath()];
            if (result === true || result === false) {
                return result;
            }
            return defaultAllowMultipleStates;
        }
        /**
         * ###<a name="setAllowMultipleStates">setAllowMultipleStates</a>###
         * Set the allow multiple states on a per path basis.
         * @param {Boolean} value
         * @param {String=} path
         */
        function setAllowMultipleStates(value, path) {
            path = path || getPath();
            if (value !== undefined) {
                result.log("setAllowMultipleStates %s", value);
                multipleStates[path] = value === true;
            }
            return !!multipleStates[path];
        }
        /**
         * ###<a name="getIgnoreParamsInPath">getIgnoreParamsInPath</a>###
         * Return weather params are ignored in storing path values.
         * @return {Boolean}
         */
        function getIgnoreParamsInPath() {
            return ignoreParamsInPath[getCurrentPathWithoutParams()] === true;
        }
        /**
         * ###<a name="setIgnoreParamsInPath">setIgnoreParamsInPath</a>###
         * Change if path is stored with or without params.
         * @param {Boolean} value
         */
        function setIgnoreParamsInPath(value) {
            result.log("setIgnoreParamsInPath %s", value);
            ignoreParamsInPath[getCurrentPathWithoutParams()] = value;
        }
        /**
         * ###<a name="hasPathState">hasPathState</a>###
         * See if there is a path that is registered or not.
         * @param {String=} path
         * @returns {boolean}
         */
        function hasPathState(path) {
            path = path || getPath();
            return !!states[path];
        }
        /**
         * ###<a name="getPathState">getPathState</a>###
         * @param {String=} path
         * @return {*}
         * @private
         */
        function getPathState(path) {
            path = path || getPath();
            if (!states[path]) {
                states[path] = {
                    $dirty: false,
                    $path: path,
                    $order: []
                };
            }
            return states[path];
        }
        /**
         * ###<a name="setPathState">setPathState</a>###
         * Override all of the path states.
         * Any columnNames not passed are set to none if not allow multiples.
         * @param {Object} pathState
         */
        function setPathState(pathState) {
            var columnName, currentPathState = getPathState();
            result.log("setPathState %s to %s", currentPathState, pathState);
            setIgnoreParamsInPath(true);
            for (columnName in pathState) {
                if (pathState.hasOwnProperty(columnName) && pathState[columnName] !== currentPathState[columnName] && !isPrivate(columnName)) {
                    setState(columnName, pathState[columnName], currentPathState);
                }
            }
        }
        /**
         * ###<a name="getState">getState</a>###
         * Returns the current state at the currentPath of the columnName.
         * 'none', 'asc', 'desc'
         * @param columnName
         * @return {String}
         */
        function getState(columnName) {
            var pathState = getPathState(getPath());
            if (pathState[columnName] === undefined) {
                pathState[columnName] = sortOptions.NONE;
            }
            return pathState[columnName];
        }
        /**
         * ###<a name="setState">setState</a>###
         * Set the state at the currentPath for that columnName.
         * @param {String} columnName
         * @param {String} state
         * @param {Object=} pathState
         */
        function setState(columnName, state, pathState) {
            var index, prevState;
            pathState = pathState || getPathState(getPath());
            if (!isPrivate(columnName) && pathState[columnName] !== state) {
                prevState = pathState[columnName];
                if (getAllowMultipleStates(pathState.$path)) {
                    index = pathState.$order.indexOf(columnName);
                    if (index !== -1) {
                        pathState.$order.splice(index, 1);
                    }
                }
                if (state !== sortOptions.NONE) {
                    if (!getAllowMultipleStates()) {
                        clear(pathState);
                    }
                    pathState.$order.push(columnName);
                }
                pathState[columnName] = state;
                if (!prevState && state === sortOptions.NONE) {
                    return;
                }
                dirtyState(pathState);
            }
        }
        /**
         * ###<a name="createKeyFromStates">createKeyFromStates</a>###
         * converts the path state into a string key. ex("description:asc|index:desc")
         * @param {Object=} pathState
         * @returns {string}
         */
        function createKeyFromStates(pathState) {
            pathState = pathState || getPathState(getPath());
            var combo = {
                text: "",
                pathState: pathState
            };
            exports.each(pathState.$order, createKeyFromState, combo);
            return combo.text;
        }
        /**
         * ###<a name="createKeyFromState">createKeyFromState</a>###
         * converts the state into a key string. ex("description:asc")
         * @param columnName
         * @param index
         * @param list
         * @param combo
         */
        function createKeyFromState(columnName, index, list, combo) {
            if (!isPrivate(columnName)) {
                combo.text += (combo.text.length ? "|" : "") + columnName + ":" + combo.pathState[columnName];
            }
        }
        /**
         * ###<a name="toggle">toggle</a>###
         * Increment the columnName's state to the next in the list.
         * @param {String} columnName
         */
        function toggle(columnName) {
            var state = getState(columnName), nextState = getNextState(state);
            result.info("toggle %s from %s to %s", columnName, state, nextState);
            setState(columnName, nextState);
            dirtyState();
        }
        /**
         * ###<a name="dirtyState">dirtyState</a>###
         * Sets a state to dirty for the next lookup.
         * @param {Object=} pathState
         */
        function dirtyState(pathState) {
            pathState = pathState || getPathState(getPath());
            result.log("dirtyState %s", pathState);
            pathState.$dirty = true;
        }
        /**
         * ###<a name="clearDirty">clearDirty</a>###
         * clears the dirty state.
         * @param {Object=} pathState
         */
        function clearDirty(pathState) {
            pathState = pathState || getPathState(getPath());
            result.log("clearDirty %s", pathState);
            pathState.$dirty = false;
        }
        /**
         * ###<a name="getNextState">getNextState</a>###
         * calculate the next state would be given a currentState. Used for toggling states.
         * @param {String} state
         * @return {String}
         */
        function getNextState(state) {
            var result = sortOptions.ASC;
            switch (state) {
              case sortOptions.NONE:
                result = sortOptions.ASC;
                break;

              case sortOptions.ASC:
                result = sortOptions.DESC;
                break;

              case sortOptions.DESC:
                result = sortOptions.NONE;
                break;
            }
            return result;
        }
        /**
         * ###<a name="hasDirtySortState">hasDirtySortState</a>###
         * Determines if a state is dirty or not.
         * @param {String=} pathState
         * @returns {boolean|*|pathState.$dirty}
         */
        function hasDirtySortState(pathState) {
            pathState = pathState || getPathState(getPath());
            return pathState.$dirty;
        }
        /**
         * ###<a name="cleanSortValue">cleanSortValue</a>###
         * Clears up undefined and null values.
         * @param value
         * @returns {string}
         */
        function cleanSortValue(value) {
            // undefined and null should be compared as an empty string.
            return value === undefined || value === null ? "" : value;
        }
        /**
         * ###<a name="getLocale">getLocale</a>###
         * Listed so it can be overridden for different locals. override by setting the method on ux.datagrid.sortStatesModel.
         * @returns {string}
         */
        function getLocale() {
            return "en";
        }
        /**
         * ###<a name="sortValueCompare">sortValueCompare</a>###
         * Compare the string values for sorting.
         * @param {String} a
         * @param {String} v
         * @returns {number}
         */
        function sortValueCompare(a, b) {
            a = cleanSortValue(a);
            b = cleanSortValue(b);
            return a > b ? 1 : a < b ? -1 : 0;
        }
        /**
         * ###<a name="sortNone">sortNone</a>###
         * @param {*} a
         * @param {*} b
         * @returns {number}
         */
        function sortNone(a, b) {
            return 0;
        }
        /**
         * ###<a name="createAscSort">createAscSort</a>###
         * Create an ASC sort wrapped on that property.
         * @param {String} property
         * @returns {Function}
         */
        function createAscSort(property) {
            return function asc(a, b) {
                var av = a[property], bv = b[property];
                return sortValueCompare(av, bv);
            };
        }
        /**
         * ###<a name="createDescSort">createDescSort</a>###
         * Create a DESC sort wrapped on that property.
         * @param {String} property
         * @returns {desc}
         */
        function createDescSort(property) {
            return function desc(a, b) {
                var av = a[property], bv = b[property];
                return -sortValueCompare(av, bv);
            };
        }
        /**
         * ###<a name="clear">clear</a>###
         * Clear the states for the currentPath.
         * @param {Object=} pathState
         */
        function clear(pathState) {
            var i;
            pathState = pathState || getPathState(getPath());
            pathState.$order.length = 0;
            for (i in pathState) {
                if (pathState.hasOwnProperty(i) && !isPrivate(i) && pathState[i] !== sortOptions.NONE) {
                    pathState[i] = sortOptions.NONE;
                }
            }
        }
        /**
         * ###<a name="clearAll">clearAll</a>###
         * Clear all stored sorts.
         */
        function clearAll() {
            states = {};
            multipleStates = {};
        }
        result.getPath = getPath;
        result.getAllowMultipleStates = getAllowMultipleStates;
        result.setAllowMultipleStates = setAllowMultipleStates;
        result.getIgnoreParamsInPath = getIgnoreParamsInPath;
        result.setIgnoreParamsInPath = setIgnoreParamsInPath;
        result.hasPathState = hasPathState;
        result.getPathState = getPathState;
        result.setPathState = setPathState;
        result.getState = getState;
        result.setState = setState;
        result.toggle = toggle;
        result.dirtyState = dirtyState;
        result.clearDirty = clearDirty;
        result.sortNone = sortNone;
        result.createAscSort = createAscSort;
        result.createDescSort = createDescSort;
        result.hasDirtySortState = hasDirtySortState;
        result.createKeyFromStates = createKeyFromStates;
        result.isPrivate = isPrivate;
        result.getLocale = getLocale;
        result.clear = clear;
        result.clearAll = clearAll;
        result.sortOptions = sortOptions;
        return result;
    }();
    return exports.datagrid.sortStatesModel;
} ]);

/**
 * ##<a name="sortModel">sortModel</a>##
 * The sortModel addon is used to apply sorting to the contents of the grid.
 * It stores the sorted state on the sortStatesModel to keep around until cleared.
 * @param {Object} sortStatesModel
 */
angular.module("ux").factory("sortModel", [ "sortStatesModel", function(sortStatesModel) {
    return function sortModel(inst) {
        // cache is the stored sort values. It needs to be cleared if the data changes.
        var result = exports.logWrapper("sortModel", {}, "blue", inst.dispatch), sorts = {}, original, cache = {}, lastSortResult;
        /**
         * ###<a name="addSortColumn">addSortColumn</a>###
         * add a column so that it's sort state can be toggled and used.
         * @param {String} name
         * @param {Object} methods
         */
        result.addSortColumn = function addSortColumn(name, methods) {
            sorts[name] = methods;
            var pathState = sortStatesModel.getPathState();
            pathState[name] = pathState[name] || sortStatesModel.sortOptions.NONE;
        };
        /**
         * ###<a name="getCache">getCache</a>###
         * @param {String} key
         * @returns {Array} - returns the last sort for that key if there is one.
         */
        result.getCache = function getCache(key) {
            return cache[key];
        };
        /**
         * ###<a name="setCache">setCache</a>###
         * Stores the sort value locally so that if that sort is again performed it will not need to process.
         * @param {String} key
         * @param {Array} value
         */
        result.setCache = function setCache(key, value) {
            cache[key] = value;
        };
        /**
         * ###<a name="applySorts">applySorts</a>###
         * Apply the sorts to the array. Pull from cache if it exists.
         * @param {Array} ary
         * @param {Object} sortOptions
         * @returns {*}
         */
        result.applySorts = function applySorts(ary, sortOptions) {
            var pathStateRef = sortStatesModel.getPathState(), currentPathState = angular.copy(pathStateRef);
            if (sortOptions) {
                result.log("apply sortOptions");
                sortStatesModel.setPathState(sortOptions);
            }
            if (original !== ary || sortStatesModel.hasDirtySortState(pathStateRef)) {
                original = ary;
                result.setCache("", original);
                // the original is always without any sort options.
                if (!result.$processing) {
                    result.$processing = true;
                    var key = sortStatesModel.createKeyFromStates(pathStateRef), event, pathState = angular.copy(pathStateRef);
                    // clone so they cannot mess with the data directly.
                    result.info("applySorts %s", key);
                    event = inst.dispatch(exports.datagrid.events.ON_BEFORE_SORT, key, currentPathState, pathState);
                    // prevent default on event to prevent sort.
                    if (!event.defaultPrevented) {
                        if (!result.getCache(key) || result.getCache(key).length !== original.length) {
                            result.log("	store sort %s", key);
                            result.setCache(key, original && original.slice(0) || []);
                            // clone it
                            ux.each(pathState.$order, applyListSort, {
                                grouped: inst.grouped,
                                pathState: pathState,
                                ary: result.getCache(key)
                            });
                        }
                        lastSortResult = result.getCache(key);
                        sortStatesModel.clearDirty(pathStateRef);
                    } else {
                        //TODO: need to unit test this to make sure it works with async sort.
                        lastSortResult = original;
                    }
                    result.$processing = false;
                    inst.dispatch(exports.datagrid.events.ON_AFTER_SORT, key, pathState, currentPathState);
                }
            }
            return lastSortResult;
        };
        /**
         * ###<a name="sortArray">sortArray</a>###
         * Perform the sort dictated by the state.
         * @param {Array} ary
         * @param {String} columnName
         * @param {Object} pathState
         * @returns {*}
         */
        function sortArray(ary, columnName, pathState) {
            var state = pathState[columnName];
            if (state && sorts[columnName]) {
                ux.util.array.sort(ary, sorts[columnName][state]);
            }
            return ary;
        }
        /**
         * ###<a name="applyListSort">applyListSort</a>###
         * Take into consideration for grouped data and apply the appropriate sorts for the array.
         * @param {String} columnName
         * @param {Number} index
         * @param {Array} list
         * @param {Object} data
         */
        function applyListSort(columnName, index, list, data) {
            var i, len;
            if (data.grouped && data.ary.length && data.ary[0].hasOwnProperty(data.grouped)) {
                len = data.ary.length;
                for (i = 0; i < len; i += 1) {
                    data.ary[i] = angular.extend({}, data.ary[i]);
                    // shallow copy
                    data.ary[i][data.grouped] = sortArray(data.ary[i][data.grouped].slice(0), columnName, data.pathState);
                }
            } else {
                sortArray(data.ary, columnName, data.pathState);
            }
        }
        /**
         * ###<a name="isApplied">isApplied</a>###
         * Determine if that sort is already applied.
         * @param {String} name
         * @param {String} methodName
         * @returns {boolean}
         */
        result.isApplied = function isApplied(name, methodName) {
            return sortStatesModel.getPathState()[name] === methodName;
        };
        /**
         * ###<a name="getSortStateOf">getSortStateOf</a>###
         * Get the current sort state of that column.
         * @param {String} name
         * @returns {*}
         */
        result.getSortStateOf = function getSortStateOf(name) {
            return sortStatesModel.getPathState()[name];
        };
        /**
         * ###<a name="multipleSort"></a>###
         * Enable or disable multiple state sorting.
         * @type {setAllowMultipleStates}
         */
        result.multipleSort = sortStatesModel.setAllowMultipleStates;
        /**
         * ###<a name="getSortkey">getSortKey</a>###
         * Get the sortKey for a state.
         * @type {Function|createKeyFromStates}
         */
        result.getSortKey = sortStatesModel.createKeyFromStates;
        /**
         * ###<a name="addSortsFromOptions">addSortsFromOptions</a>###
         * Based on the options passed, automatically add sort columns for those and create states.
         * If the states already exist apply those states on the render.
         */
        function addSortsFromOptions() {
            var i, methods, alreadyHasState = sortStatesModel.hasPathState(), pathState = sortStatesModel.getPathState();
            if (inst.options.sorts) {
                for (i in inst.options.sorts) {
                    if (typeof inst.options.sorts[i] === "object") {
                        sortStatesModel.setState(i, inst.options.sorts[i].value, pathState);
                        // value is the default sort state.
                        methods = inst.options.sorts[i];
                    } else {
                        if (!alreadyHasState) {
                            sortStatesModel.setState(i, inst.options.sorts[i], pathState);
                        }
                        methods = {
                            asc: sortStatesModel.createAscSort(i),
                            desc: sortStatesModel.createDescSort(i),
                            none: sortStatesModel.sortNone
                        };
                    }
                    result.addSortColumn(i, methods);
                }
            }
        }
        /**
         * ###<a name="toggleSort">toggleSort</a>###
         * Sorts always toggle clockwise none -> asc -> desc.
         * @param name
         */
        result.toggleSort = function toggleSort(name) {
            result.log("toggleSort %s", name);
            sortStatesModel.toggle(name);
            result.clear();
            result.applySorts(original);
        };
        /**
         * ###<a name="clear">clear</a>###
         * clear all cached sort values for this grid.
         */
        result.clear = function clear() {
            cache = {};
        };
        /**
         * ###<a name="destroy">destroy</a>###
         */
        result.destroy = function destroy() {
            result = null;
            lastSortResult = null;
            sorts = null;
            cache = null;
            original = null;
            inst.sortModel = null;
            inst = null;
        };
        inst.sortModel = result;
        addSortsFromOptions();
        return inst;
    };
} ]);
}(this.ux = this.ux || {}, function() {return this;}()));
