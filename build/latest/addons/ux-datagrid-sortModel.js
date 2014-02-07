/*
* uxDatagrid v.0.3.1-alpha
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
exports.datagrid.events.ON_BEFORE_SORT = "datagrid:onBeforeSort";

exports.datagrid.events.ON_AFTER_SORT = "datagrid:onAfterSort";

angular.module("ux").service("sortStatesModel", [ "$location", "$rootScope", function($location, $rootScope) {
    // this is a singleton.
    exports.datagrid.sortStatesModel = function() {
        /**************************************************************************************
         * ColumnStates for sorting.
         * Keeps track of weather a column is sorted or not.
         * It persists based on the path.
         * @type {Object}
         **************************************************************************************/
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
        function isPrivate(prop) {
            return prop.charAt(0) === "$";
        }
        /**
         * Get the whole url as a key to store the scroll value against.
         * @returns {*}
         */
        function getCurrentPath() {
            return $location.path();
        }
        /**
         * Return just the url without any GET/Search params.
         * @returns {*}
         */
        function getCurrentPathWithoutParams() {
            return getCurrentPath().split("?").shift();
        }
        /**
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
         * Return weather params are ignored in storing path values.
         * @return {Boolean}
         */
        function getIgnoreParamsInPath() {
            return ignoreParamsInPath[getCurrentPathWithoutParams()] === true;
        }
        /**
         * Change if path is stored with or without params.
         * @param value
         */
        function setIgnoreParamsInPath(value) {
            result.log("setIgnoreParamsInPath %s", value);
            ignoreParamsInPath[getCurrentPathWithoutParams()] = value;
        }
        /**
         * @param path
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
         * Override all of the path states.
         * Any columnNames not passed are set to none if not allow multiples.
         * @param pathState
         */
        function setPathState(pathState) {
            var columnName, currentPathState = getPathState();
            result.log("setPathState %s to %s", currentPathState, pathState);
            setIgnoreParamsInPath(true);
            for (columnName in pathState) {
                if (pathState.hasOwnProperty(columnName) && pathState[columnName] !== currentPathState[columnName]) {
                    setState(columnName, pathState[columnName], currentPathState);
                }
            }
        }
        /**
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
         * Set the state at the currentPath for that columnName.
         * @param columnName
         * @param state
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
        function createKeyFromStates(pathState) {
            pathState = pathState || getPathState(getPath());
            var combo = {
                text: "",
                pathState: pathState
            };
            exports.each(pathState.$order, createKeyFromState, combo);
            return combo.text;
        }
        function createKeyFromState(columnName, index, list, combo) {
            if (!isPrivate(columnName)) {
                combo.text += (combo.text.length ? "|" : "") + columnName + ":" + combo.pathState[columnName];
            }
        }
        /**
         * Increment the columnName's state to the next in the list.
         * @param columnName
         */
        function toggle(columnName) {
            var state = getState(columnName), nextState = getNextState(state);
            result.info("toggle %s from %s to %s", columnName, state, nextState);
            setState(columnName, nextState);
            dirtyState();
        }
        /**
         * @param {Object=} pathState
         */
        function dirtyState(pathState) {
            pathState = pathState || getPathState(getPath());
            result.log("dirtyState %s", pathState);
            pathState.$dirty = true;
        }
        /**
         * @param {Object=} pathState
         */
        function clearDirty(pathState) {
            pathState = pathState || getPathState(getPath());
            result.log("clearDirty %s", pathState);
            pathState.$dirty = false;
        }
        /**
         * calculate the next state would be given a currentState.
         * @param state
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
        function hasDirtySortState(pathState) {
            pathState = pathState || getPathState(getPath());
            return pathState.$dirty;
        }
        // sorts
        function sortNone(a, b) {
            return 0;
        }
        function createAscSort(property) {
            return function asc(a, b) {
                var av = a[property], bv = b[property];
                return av > bv ? 1 : bv > av ? -1 : 0;
            };
        }
        function createDescSort(property) {
            return function desc(a, b) {
                var av = a[property], bv = b[property];
                return -1 * (av > bv ? 1 : bv > av ? -1 : 0);
            };
        }
        /**
         * Clear the states for the currentPath.
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
        function clearAll() {
            states = {};
            multipleStates = {};
        }
        function destroy() {
            states = null;
            multipleStates = null;
            ignoreParamsInPath = null;
            defaultAllowMultipleStates = null;
            sortOptions = null;
            result = null;
        }
        result.getPath = getPath;
        result.getAllowMultipleStates = getAllowMultipleStates;
        result.setAllowMultipleStates = setAllowMultipleStates;
        result.getIgnoreParamsInPath = getIgnoreParamsInPath;
        result.setIgnoreParamsInPath = setIgnoreParamsInPath;
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
        result.clear = clear;
        result.clearAll = clearAll;
        result.destroy = destroy;
        return result;
    }();
    return exports.datagrid.sortStatesModel;
} ]);

angular.module("ux").factory("sortModel", [ "sortStatesModel", function(sortStatesModel) {
    return function sortModel(inst) {
        // cache is the stored sort values. It needs to be cleared if the data changes.
        var result = exports.logWrapper("sortModel", {}, "blue", inst.dispatch), sorts = {}, original, cache = {}, lastSortResult;
        result.addSortColumn = function addSortColumn(name, methods) {
            sorts[name] = methods;
        };
        result.getCache = function getCache(key) {
            return cache[key];
        };
        result.setCache = function setCache(key, value) {
            cache[key] = value;
        };
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
                inst.dispatch(exports.datagrid.events.ON_AFTER_SORT, key, pathState, currentPathState);
            }
            return lastSortResult;
        };
        function sortArray(ary, columnName, pathState) {
            ux.util.array.sort(ary, sorts[columnName][pathState[columnName]]);
            return ary;
        }
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
        result.isApplied = function isApplied(name, methodName) {
            return sortStatesModel.getPathState()[name] === methodName;
        };
        result.getSortStateOf = function getSortStateOf(name) {
            return sortStatesModel.getPathState()[name];
        };
        result.multipleSort = sortStatesModel.setAllowMultipleStates;
        result.getSortKey = sortStatesModel.createKeyFromStates;
        function addSortsFromOptions() {
            var i, methods, pathState = sortStatesModel.getPathState();
            if (inst.options.sorts) {
                for (i in inst.options.sorts) {
                    if (typeof inst.options.sorts[i] === "object") {
                        sortStatesModel.setState(i, inst.options.sorts[i].value, pathState);
                        // value is the default sort state.
                        methods = inst.options.sorts[i];
                    } else {
                        sortStatesModel.setState(i, inst.options.sorts[i], pathState);
                        // set the default sort state.
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
        result.toggleSort = function toggleSort(name) {
            result.log("toggleSort %s", name);
            sortStatesModel.toggle(name);
            result.clear();
            result.applySorts(original);
        };
        result.clear = function clear() {
            cache = {};
        };
        result.destroy = function destroy() {
            result = null;
            lastSortResult = null;
            sorts = null;
            cache = null;
            original = null;
            inst = null;
        };
        inst.sortModel = result;
        addSortsFromOptions();
        return inst;
    };
} ]);
}(this.ux = this.ux || {}, function() {return this;}()));
