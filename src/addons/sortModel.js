exports.datagrid.events.BEFORE_SORT = "datagrid:beforeSort";
exports.datagrid.events.AFTER_SORT = "datagrid:afterSort";
angular.module('ux').factory('sortModel', function () {
    return function sortModel(exp) {
        // cache is the stored sort values. It needs to be cleared if the data changes.
        var result = {}, sorts = {}, sortList = [], original, cache = {};

        function none(a, b) {
            return 0;
        }

        function createAscSort(name) {
            return function asc(a, b) {
                var av = a[name], bv = b[name];
                return av > bv ? 1 : (bv > av ? -1 : 0);
            };
        }

        function createDescSort(name) {
            return function desc(a, b) {
                var av = a[name], bv = b[name];
                return -1 * (av > bv ? 1 : (bv > av ? -1 : 0));
            };
        }

        result.addSortColumn = function addSortColumn(name, methods) {
            var i;
            sorts[name] = methods;
            if (!methods.$order) {
                methods.$order = sortList.length;
            }
            methods.$name = name;
            methods.$names = [];
            for (i in methods) {
                if (i.charAt(0) !== '$' && methods.hasOwnProperty(i)) {
                    methods.$names.push(i);
                }
            }
            sortList.push(methods);
        };

        function applySort(name, methodName) {
            var methods = sorts[name];
            methods.$selected = methodName;
        }

        result.getCache = function getCache(key) {
            return cache[key];
        };

        result.setCache = function setCache(key, value) {
            cache[key] = value;
        };

        result.applySorts = function applySorts(ary, sortOptions) {
            original = ary;
            var combo = {text:''}, i;
            if (sortOptions) {
                for (i in sortOptions) {
                    applySort(i, sortOptions[i]);
                }
            }
            ux.each(sortList, getSortCombo, combo);
            exp.dispatch(exports.datagrid.events.BEFORE_SORT, combo.text);
            if (!result.getCache(combo.text)) {
                exp.flow.info("store sort %s", combo.text);
                result.setCache(combo.text, original.slice(0));
                ux.each(sortList, applyListSort, result.getCache(combo.text));
            }
            exp.dispatch(exports.datagrid.events.AFTER_SORT, combo.text);
            return result.getCache(combo.text);
        };

        function getSortCombo(methods, index, list, combo) {
            if (methods.$selected !== 'none') {
                combo.text += (combo.text.length ? '|' : '') + methods.$name + ':' + methods.$selected;
            }
        }

        function applyListSort(methods, index, list, ary) {
            ux.util.array.sort(ary, methods[methods.$selected]);
        }

        result.isApplied = function isApplied(name, methodName) {
            return !!(sorts[name] && sorts[name].$selected === methodName);
        };

        result.getSortStateOf = function getSortStateOf(name) {
            var methods = sorts[name];
            return methods && methods.$selected || '';
        };

        function addSortsFromOptions() {
            var i, methods;
            if (exp.options.sorts) {
                for (i in exp.options.sorts) {
                    if (typeof exp.options.sorts[i] === 'object') {
                        methods = exp.options.sorts[i];
                    } else {
                        methods = {
                            $selected: exp.options.sorts[i],
                            asc: createAscSort(i),
                            desc: createDescSort(i),
                            none: none
                        };
                    }
                    result.addSortColumn(i, methods);
                }
            }
        }

        result.toggleSort = function toggleSort(name) {
            var s = sorts[name], index = (s.$names.indexOf(s.$selected) + 1) % s.$names.length;
            applySort(name, s.$names[index]);
        };

        result.clear = function clear() {
            cache = {};
        };

        result.destroy = function destroy() {
            result = null;
            sorts = null;
            sortList = null;
            cache = null;
            original = null;
            exp = null;
        };

        exp.sortModel = result;
        addSortsFromOptions();
        return exp;
    };
});