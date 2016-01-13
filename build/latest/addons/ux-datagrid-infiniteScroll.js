/*!
* ux-angularjs-datagrid v.1.4.8
* (c) 2016, Obogo
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

/**
 * ##<a name="infiniteScroll">infiniteScroll</a>##
 * Datagrid infinite scroll adds more data when the list scrolls to the bottom.
 * @type {string}
 */
angular.module("ux").factory("infiniteScroll", function() {
    return [ "inst", "$filter", function infiniteScroll(inst, $filter) {
        var result = {}, scrollOffset = -1, loadingRow = {
            _template: "loadingRow"
        }, unwatchers = [], focusAfterSelector;
        /**
         * Set the default values for the infiniteScroll options.
         * enable: true, limit: 0
         * To override these pass to the datagrid options in the template.
         * {infiniteScroll: {enable: true, limit: 100}}
         * @type {{}|*|infiniteScroll|infiniteScroll}
         */
        inst.options.infiniteScroll = inst.options.infiniteScroll || {};
        inst.options.infiniteScroll.enable = inst.options.infiniteScroll.enable === undefined ? true : inst.options.infiniteScroll.enable;
        inst.options.infiniteScroll.limit = inst.options.infiniteScroll.limit === undefined ? 0 : inst.options.infiniteScroll.limit;
        /**
         * ###<a name="onBeforeDataChange">onBeforeDataChange</a>###
         * Before the data change is complete. We add the loading row.
         * @param event
         * @param newVal
         * @param oldVal
         */
        result.onBeforeDataChange = function(event, newVal, oldVal) {
            if (inst.options.infiniteScroll.enable && newVal) {
                var limit = getLimit();
                if (limit) {
                    buildFocusAfterUpdateSelector();
                    event.newValue = $filter("limitTo")(newVal, limit);
                    if (event.newValue.length < limit) {
                        event.preventDefault();
                        result.addExtraRow(event.newValue);
                    }
                }
            }
        };
        function buildFocusAfterUpdateSelector() {
            // this will only happen if you have focusManager addon loaded.
            // and the activeElement is in the grid.
            if (ux.selector && inst.element[0].contains(document.activeElement)) {
                // get the row id of the focused element.
                var rowIndex = inst.getRowIndexFromElement(document.activeElement);
                var rowEl = inst.getRowElm(rowIndex);
                var activeElement = document.activeElement;
                focusAfterSelector = {
                    rowIndex: rowIndex,
                    selector: ux.selector.quickSelector(activeElement, rowEl[0], inst.options.gridFocusManager && inst.options.gridFocusManager.filterClasses || [])
                };
                // drop the visible off selector if it exists.
                focusAfterSelector.selector = focusAfterSelector.selector.replace(/:visible$/, "");
            } else {
                focusAfterSelector = null;
            }
        }
        /**
         * ###<a name="getLimit">getLimit</a>
         * Return the limit of the options. Execute function or number to return limit.
         * @returns {limit|*|limit|number|limit|limit}
         */
        function getLimit() {
            if (typeof inst.options.infiniteScroll.limit === "function") {
                return inst.options.infiniteScroll.limit();
            }
            return inst.options.infiniteScroll.limit || 0;
        }
        result.getLimit = getLimit;
        /**
         * ###<a name="addExtraRow">addExtraRow</a>###
         * Add the extra row to the normalized grid data for the loading row.
         * This will add an object with the _template: "loadingRow" property.
         * If you have overridden the [getTemplate][angular-ux-datagrid.js.html#getTemplate] then you will need
         * to modify it to load the template for loading row matching on the _template property of that item.
         * @param data
         */
        result.addExtraRow = function(data) {
            scrollOffset = inst.values.scroll;
            if (data.length && data[data.length - 1] !== loadingRow) {
                inst.element.addClass("loadingInfiniteRowData");
                data.push(loadingRow);
            }
        };
        result.afterRowsAdded = function(event) {
            var el, focusEl;
            inst.element.removeClass("loadingInfiniteRowData");
            if (focusAfterSelector) {
                el = inst.getRowElm(focusAfterSelector.rowIndex);
                focusEl = el[0].querySelector(focusAfterSelector.selector);
                if (focusEl.select) {
                    focusEl.select();
                }
                if (focusEl) {
                    focusEl.focus();
                }
            }
        };
        /**
         * ###<a name="enable">enable</a>###
         * enable the listeners for the infiniteScroll addon.
         */
        result.enable = function() {
            unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_BEFORE_DATA_CHANGE, result.onBeforeDataChange));
            unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_RENDER_AFTER_DATA_CHANGE, result.afterRowsAdded));
        };
        /**
         * ###<a name="disable">disable</a>###
         * disable the listeners for the infiniteScroll addon.
         */
        result.disable = function() {
            while (unwatchers.length) {
                unwatchers.pop()();
            }
        };
        /**
         * ###<a name="destroy">destroy</a>###
         * clean up the addon when destroyed.
         */
        result.destroy = function() {
            result.disable();
            loadingRow = null;
            result = null;
        };
        result.enable();
        inst.infiniteScroll = result;
    } ];
});
}(this.ux = this.ux || {}, function() {return this;}()));
