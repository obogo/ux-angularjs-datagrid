/*!
* ux-angularjs-datagrid v.1.2.1
* (c) 2015, Obogo
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

exports.datagrid.events.COLLAPSE_ALL_GROUPS = "datagrid:collapseAllGroups";

exports.datagrid.events.EXPAND_ALL_GROUPS = "datagrid:expandAllGroups";

exports.datagrid.events.COLLAPSE_GROUP = "datagrid:collapseGroup";

exports.datagrid.events.EXPAND_GROUP = "datagrid:expandGroup";

exports.datagrid.events.TOGGLE_GROUP = "datagrid:toggleGroup";

/**
 * ##<a name="expandableGroups">expandableGroups</a>##
 * The expandable groups works on the concept of remvoing items from the array that are collapsed.
 * So it keeps the original array that is sent, or if it is setAgain it will collapse all.
 * By default all of these are collapsed. Hence the name expandableGroups.
 */
angular.module("ux").factory("expandableGroups", function() {
    return [ "inst", function(inst) {
        var result = exports.logWrapper("expandableGroups", {}, "orange", inst.dispatch), options = inst.expandableGroups || {}, expanded = {}, resultData = [], instSetData = inst.setData, getNormalized = inst.getData;
        /**
        * ###<a name="generateData">generateData</a>###
        * Generate an array of only the items that should be shown. A normalized array.
        * It uses the same array instance and does not create a new one.
        */
        function generateData() {
            resultData.length = 0;
            var normalized = getNormalized(), i = 0, j = -1, iLen = normalized && normalized.length || 0, item;
            while (i < iLen) {
                item = normalized[i];
                if (isGroup(item)) {
                    j += 1;
                    resultData.push(item);
                } else if (expanded[j]) {
                    resultData.push(item);
                }
                i += 1;
            }
            if (normalized.length && !resultData.length && window.console && window.console.warn) {
                console.warn("ExpandableGroups does not work with async loaded groups. It cannot keep the indexes in sync. Try this example http://jsfiddle.net/wesjones/3Wg79/");
            }
        }
        /**
        * ###<a name="isGroup">isGroup</a>###
        * Determine if an item is a group or not.
        * @private
        * @param item
        * @returns {*|.attributes.length|options.length|types.length|File.toJSON.length|length}
        */
        function isGroup(item) {
            if (options.hideEmptyGroups) {
                return item[inst.grouped] && item[inst.grouped].length;
            }
            return item[inst.grouped];
        }
        /**
        * ###<a name="setData">setData</a>###
        * We ned to override the setData method that is assigned in the normalizeModel so that we can
        * replace the return value with our overridden array that has collapsed rows removed from the array.
        * @param data
        * @param grouped
        * @returns {Array}
        */
        inst.setData = function(data, grouped) {
            instSetData.apply(inst, arguments);
            generateData();
            return resultData;
        };
        /**
        * ###<a name="getData">getData</a>###
        * Override the getData so no one can get the other data than what is supposed to be shown for normalized data.
        * @returns {Array}
        */
        inst.getData = function() {
            return resultData;
        };
        /**
        * ###<a name="update">update</a>###
        * Regenerate the normalized data and cause the grid to update.
        * @private
        */
        function update() {
            generateData();
            inst.reset();
        }
        /**
        * ###<a name="convertIndex">convertIndex</a>###
        * This will convert a row index into a group index so they can collapse correctly.
        * @private
        * @param index
        * @returns {number}
        */
        function convertIndex(index) {
            var i = 0, j = 0;
            while (i < index) {
                if (isGroup(resultData[i])) {
                    j += 1;
                }
                i += 1;
            }
            return j;
        }
        /**
        * ###<a name="expand">expand</a>###
        * Expand the group.
        * @param rowIndex
        * @param isGroupIndex
        */
        result.expand = function(rowIndex, isGroupIndex) {
            var groupIndex = isGroupIndex ? rowIndex : convertIndex(rowIndex);
            expanded[groupIndex] = true;
            update();
        };
        /**
        * ###<a name="collapse">collapse</a>###
        * Collapse the group.
        * @param rowIndex
        * @param isGroupIndex
        */
        result.collapse = function(rowIndex, isGroupIndex) {
            var groupIndex = isGroupIndex ? rowIndex : convertIndex(rowIndex);
            delete expanded[groupIndex];
            update();
        };
        /**
        * ###<a name="toggle">toggle</a>###
        * Toggle the collapse or expanse of a group.
        * @param rowIndex
        */
        result.toggle = function(rowIndex) {
            var groupIndex = convertIndex(rowIndex);
            if (expanded[groupIndex]) {
                result.collapse(groupIndex, true);
            } else {
                result.expand(groupIndex, true);
            }
        };
        /**
        * ###<a name="isExpanded">isExpanded</a>###
        * Special Thanks to https://github.com/Krisa
        * Public method to allow other elements to tell if it is expanded. Such as for CSS.
        * @param rowIndex
        * @returns {boolean}
        */
        result.isExpanded = function(rowIndex) {
            var groupIndex = convertIndex(rowIndex);
            return !!expanded[groupIndex];
        };
        // Add listeners.
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.EXPAND_GROUP, function(event, index) {
            result.expand(index);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.COLLAPSE_GROUP, function(event, index) {
            result.collapse(index);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.TOGGLE_GROUP, function(event, index) {
            result.toggle(convertIndex(index));
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.COLLAPSE_ALL_GROUPS, function(event, index) {
            expanded = {};
            update();
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.EXPAND_ALL_GROUPS, function(event, index) {
            var originalData = inst.getOriginalData();
            expanded = {};
            exports.each(originalData, function(item, index) {
                expanded[index] = true;
            });
            update();
        }));
        // assign public api to datagrid.
        inst.expandableGroups = result;
        return inst;
    } ];
});
}(this.ux = this.ux || {}, function() {return this;}()));
