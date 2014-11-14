exports.datagrid.events.ON_BEFORE_SORT = "datagrid:onBeforeSort";
exports.datagrid.events.ON_AFTER_SORT = "datagrid:onAfterSort";
exports.datagrid.events.ON_BEFORE_TOGGLE_SORT = "datagrid:onBeforeToggleSort";
exports.datagrid.events.ON_AFTER_TOGGLE_SORT = "datagrid:onAfterToggleSort";
exports.datagrid.events.CLEAR_SORTS = "datagrid:clearSorts";
exports.datagrid.events.CLEAR_ALL_SORTS = "datagrid:clearAllSorts";
angular.module('ux').service('sortStatesModel', ['$location', '$rootScope', function ($location, $rootScope) {
    /**************************************************************************************
     * ##<a name="sortStatesModel">sortStatesModel</a>##
     * ColumnStates for sorting. Singleton.
     * Keeps track of weather a column is sorted or not.
     * It persists based on the path.
     * @type {Object}
     **************************************************************************************/
    exports.datagrid.sortStatesModel = (function () {
        var api = exports.logWrapper('columnSortStatesModel', {}, 'blue', function () {
                $rootScope.$emit.apply($rootScope, arguments);
            }),
            sortOptions = {
                ASC: 'asc',
                DESC: 'desc',
                NONE: 'none'
            },
            lastPath = '',
            states = {},
            multipleStates = {},
            ignoreParamsInPath = {},
            /**
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
            return prop.charAt(0) === '$';
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
            return api.getCurrentPath().split('?').shift();
        }

        /**
         * ###<a name="getPath">getPath</a>###
         * @return {string}
         */
        function getPath() {
            var path;
            if (api.getIgnoreParamsInPath()) {
                path = api.getCurrentPathWithoutParams();
            } else {
                path = api.getCurrentPath();
            }
            if (path !== lastPath) {
                api.log("getPath changed from %s to %s", lastPath, path);
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
            var result = multipleStates[api.getPath()];
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
            path = path || api.getPath();
            if (value !== undefined) {
                api.log("setAllowMultipleStates %s", value);
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
            return ignoreParamsInPath[api.getCurrentPathWithoutParams()] === true;
        }

        /**
         * ###<a name="setIgnoreParamsInPath">setIgnoreParamsInPath</a>###
         * Change if path is stored with or without params.
         * @param {Boolean} value
         */
        function setIgnoreParamsInPath(value) {
            api.log("setIgnoreParamsInPath %s", value);
            ignoreParamsInPath[api.getCurrentPathWithoutParams()] = value;
        }

        /**
         * ###<a name="hasPathState">hasPathState</a>###
         * See if there is a path that is registered or not.
         * @param {String=} path
         * @returns {boolean}
         */
        function hasPathState(path) {
            path = path || api.getPath();
            return !!states[path];
        }

        /**
         * ###<a name="getPathState">getPathState</a>###
         * @param {String=} path
         * @return {*}
         * @private
         */
        function getPathState(path) {
            path = path || api.getPath();
            if (!states[path]) {
                states[path] = {$dirty: false, $path: path, $order: []};
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
            var columnName,
                currentPathState = api.getPathState();
            api.log("setPathState %s to %s", currentPathState, pathState);
            api.setIgnoreParamsInPath(true);
            for (columnName in pathState) {
                if (Object.prototype.hasOwnProperty.apply(pathState, [columnName]) && pathState[columnName] !== currentPathState[columnName] && !isPrivate(columnName)) {
                    api.setState(columnName, pathState[columnName], currentPathState);
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
            var pathState = api.getPathState(api.getPath());
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
            pathState = pathState || api.getPathState(api.getPath());
            if (!api.isPrivate(columnName) && pathState[columnName] !== state) {
                prevState = pathState[columnName];
                if (api.getAllowMultipleStates(pathState.$path)) {
                    index = pathState.$order.indexOf(columnName);
                    if (index !== -1) {
                        pathState.$order.splice(index, 1);
                    }
                }
                if (state !== sortOptions.NONE) {
                    if (!api.getAllowMultipleStates()) {
                        api.clear(pathState);
                    }
                    pathState.$order.push(columnName);
                }
                pathState[columnName] = state;
                if (!prevState && state === sortOptions.NONE) {
                    return; // it was null and we changed it to none. So nothing really changed.
                }
                api.dirtyState(pathState);
            }
        }

        /**
         * ###<a name="createKeyFromStates">createKeyFromStates</a>###
         * converts the path state into a string key. ex("description:asc|index:desc")
         * @param {Object=} pathState
         * @returns {string}
         */
        function createKeyFromStates(pathState) {
            pathState = pathState || api.getPathState(api.getPath());
            var combo = {text: '', pathState: pathState};
            exports.each(pathState.$order, api.createKeyFromState, combo);
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
            if (!api.isPrivate(columnName)) {
                combo.text += (combo.text.length ? '|' : '') + columnName + ':' + combo.pathState[columnName];
            }
        }

        /**
         * ###<a name="toggle">toggle</a>###
         * Increment the columnName's state to the next in the list.
         * @param {String} columnName
         */
        function toggle(columnName) {
            var state = api.getState(columnName), nextState = api.getNextState(state);
            api.info('toggle %s from %s to %s', columnName, state, nextState);
            api.setState(columnName, nextState);
            api.dirtyState();
        }

        /**
         * ###<a name="dirtyState">dirtyState</a>###
         * Sets a state to dirty for the next lookup.
         * @param {Object=} pathState
         */
        function dirtyState(pathState) {
            pathState = pathState || api.getPathState(api.getPath());
            api.log("dirtyState %s", pathState);
            pathState.$dirty = true;
        }

        /**
         * ###<a name="clearDirty">clearDirty</a>###
         * clears the dirty state.
         * @param {Object=} pathState
         */
        function clearDirty(pathState) {
            pathState = pathState || api.getPathState(api.getPath());
            api.log("clearDirty %s", pathState);
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
            pathState = pathState || api.getPathState(api.getPath());
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
            var result = value === undefined || value === null ? '' : value;
            if (typeof result === "string") {
                return result.toLowerCase();
            }
            return result;
        }

        /**
         * ###<a name="getLocale">getLocale</a>###
         * Listed so it can be overridden for different locals. override by setting the method on ux.datagrid.sortStatesModel.
         * @returns {string}
         */
        function getLocale() {
            return 'en';
        }

        /**
         * ###<a name="sortValueCompare">sortValueCompare</a>###
         * Compare the string values for sorting.
         * @param {String} a
         * @param {String} v
         * @returns {number}
         */
        function sortValueCompare(a, b) {
            a = api.cleanSortValue(a);
            b = api.cleanSortValue(b);
            return a > b ? 1 : (a < b ? -1 : 0);
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
                return api.sortValueCompare(av, bv);
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
                return -api.sortValueCompare(av, bv);
            };
        }

        /**
         * ###<a name="clear">clear</a>###
         * Clear the states for the currentPath.
         * @param {Object=} pathState
         */
        function clear(pathState) {
            var i;
            pathState = pathState || api.getPathState(api.getPath());
            pathState.$order.length = 0;
            for (i in pathState) {
                if (Object.prototype.hasOwnProperty.apply(pathState, [i]) && !api.isPrivate(i) && pathState[i] !== sortOptions.NONE) {
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

        api.getPath = getPath;
        api.getCurrentPath = getCurrentPath;
        api.getCurrentPathWithoutParams = getCurrentPathWithoutParams;
        api.sortValueCompare = sortValueCompare;
        api.cleanSortValue = cleanSortValue;
        api.getNextState = getNextState;
        api.createKeyFromState = createKeyFromState;
        api.getAllowMultipleStates = getAllowMultipleStates;
        api.setAllowMultipleStates = setAllowMultipleStates;
        api.getIgnoreParamsInPath = getIgnoreParamsInPath;
        api.setIgnoreParamsInPath = setIgnoreParamsInPath;
        api.hasPathState = hasPathState;
        api.getPathState = getPathState;
        api.setPathState = setPathState;
        api.getState = getState;
        api.setState = setState;
        api.toggle = toggle;
        api.dirtyState = dirtyState;
        api.clearDirty = clearDirty;
        api.sortNone = sortNone;
        api.createAscSort = createAscSort;
        api.createDescSort = createDescSort;
        api.hasDirtySortState = hasDirtySortState;
        api.createKeyFromStates = createKeyFromStates;
        api.isPrivate = isPrivate;
        api.getLocale = getLocale;
        api.clear = clear;
        api.clearAll = clearAll;
        api.sortOptions = sortOptions;

        return api;
    }());
    return exports.datagrid.sortStatesModel;
}]);


/**
 * ##<a name="sortModel">sortModel</a>##
 * The sortModel addon is used to apply sorting to the contents of the grid.
 * It stores the sorted state on the sortStatesModel to keep around until cleared.
 * @param {Object} sortStatesModel
 */
angular.module('ux').factory('sortModel', ['sortStatesModel', function (sortStatesModel) {

    return function sortModel(inst) {
        // cache is the stored sort values. It needs to be cleared if the data changes.
        var result = exports.logWrapper('sortModel', {}, 'blue', inst.dispatch), sorts = {}, original, cache = {},
            options = inst.options.sortModel || {}, lastSortResult;

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
         * @param {Boolean=} clear
         * @returns {*}
         */
        result.applySorts = function applySorts(ary, sortOptions, clear) {
            var pathStateRef = sortStatesModel.getPathState(),
                currentPathState = angular.copy(pathStateRef);
            if (sortOptions) {
                result.log("apply sortOptions");
                sortStatesModel.setPathState(sortOptions);
            }
            if (original !== ary || sortStatesModel.hasDirtySortState(pathStateRef)) {
                original = ary;
                if (!original) {
                    lastSortResult = original;
                    return lastSortResult;
                }
                if (clear) {
                    result.clear();
                }
                result.setCache('', original);// the original is always without any sort options.
                if (!result.$processing) {
                    result.$processing = true;
                    var key = sortStatesModel.createKeyFromStates(pathStateRef), event,
                        pathState = angular.copy(pathStateRef); // clone so they cannot mess with the data directly.
                    result.info("applySorts %s", key);
                    event = inst.dispatch(exports.datagrid.events.ON_BEFORE_SORT, key, currentPathState, pathState);
                    // prevent default on event to prevent sort.
                    if (!event.defaultPrevented) {
                        if (!result.getCache(key) || result.getCache(key).length !== original.length) {
                            result.log("\tstore sort %s", key);
                            result.setCache(key, original && original.slice(0) || []); // clone it
                            ux.each(pathState.$order, applyListSort, {
                                grouped: inst.grouped,
                                pathState: pathState,
                                ary: result.getCache(key)
                            });
                        } else {
                            result.log("\tpull sort from cache");
                        }
                        lastSortResult = result.getCache(key);
                        sortStatesModel.clearDirty(pathStateRef);
                        if (options.enableCache === false) {
                            result.clear();
                        }
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
            if (!options.groupSort && data.grouped && data.ary.length && data.ary[0].hasOwnProperty(data.grouped)) {
                len = data.ary.length;
                for (i = 0; i < len; i += 1) {
                    data.ary[i] = angular.extend({}, data.ary[i]);// shallow copy
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
            options.sorts = options.sorts || inst.options.sorts;
            if (options.sorts) {
                for (i in options.sorts) {
                    if (typeof options.sorts[i] === 'object') {
                        sortStatesModel.setState(i, options.sorts[i].value, pathState);// value is the default sort state.
                        methods = options.sorts[i];// allow them to pass in their own sort methods.
                    } else {
                        if (!alreadyHasState) {
                            sortStatesModel.setState(i, options.sorts[i], pathState); // set the default sort state.
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
         * @param {String} name
         */
        result.toggleSort = function toggleSort(name) {
            result.log('toggleSort %s', name);
            inst.dispatch(exports.datagrid.events.ON_BEFORE_TOGGLE_SORT, name);
            if (inst.creepRenderModel) {
                inst.creepRenderModel.stop();
            }
            sortStatesModel.toggle(name);
//            result.clear();
            result.applySorts(original);
            inst.dispatch(exports.datagrid.events.ON_AFTER_TOGGLE_SORT, name);
        };

        /**
         * ##<a name="toggleSort">toggleSort</a>###
         * Sets the sort value to asc, desc, or none
         * @param {String} name
         * @param {String='none'} state
         */
        result.setSortStateOf = function (name, state) {
            if (state === 'none' || state === 'asc' || state === 'desc') {
                sortStatesModel.setState(name, state);
            }
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

        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.CLEAR_SORTS, exports.datagrid.sortStatesModel.clear));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.CLEAR_ALL_SORTS, exports.datagrid.sortStatesModel.clearAll));

        inst.sortModel = result;
        addSortsFromOptions();
        return inst;
    };
}]);