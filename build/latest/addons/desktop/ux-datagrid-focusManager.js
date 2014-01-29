/*
* uxDatagrid v.0.2.3
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
/*global exports */
/**
 * Author: Jason Farrell
 * Author URI: http://useallfive.com/
 *
 * Description: Handles all things involving element visibility.
 * Package URL: https://github.com/UseAllFive/ua5-js-utils
 * 
 * Modified by Wes Jones.
 */
exports.visibility = function() {
    /**
     * Checks if a DOM element is visible. Takes into
     * consideration its parents and overflow.
     *
     * @param (el)      the DOM element to check if is visible
     */
    function _isVisible(el) {
        var p = el.parentNode, VISIBLE_PADDING = 2;
        if (!_elementInDocument(el)) {
            return false;
        }
        //-- Return true for document node
        if (9 === p.nodeType) {
            return true;
        }
        //-- Return false if our element is invisible
        if ("0" === _getStyle(el, "opacity") || "none" === _getStyle(el, "display") || "hidden" === _getStyle(el, "visibility")) {
            return false;
        }
        //-- If we have a parent, let's continue:
        if (p) {
            //-- Let's recursively check upwards:
            return _isVisible(p);
        }
        return true;
    }
    //-- Cross browser method to get style properties:
    function _getStyle(el, property) {
        if (window.getComputedStyle) {
            return document.defaultView.getComputedStyle(el, null)[property];
        }
        if (el.currentStyle) {
            return el.currentStyle[property];
        }
        return undefined;
    }
    function _elementInDocument(element) {
        while (element = element.parentNode) {
            if (element == document) {
                return true;
            }
        }
        return false;
    }
    return {
        getStyle: _getStyle,
        isVisible: _isVisible
    };
}();

/*global exports */
exports.selector = function() {
    var $ = $ || angular.element;
    /**
     * build the string selector for the element.
     * @param {DomElement} element
     * @param {DomElement=} maxParent
     * @param {Function=} ignoreClass
     * @returns {string}
     */
    function getSelector(element, maxParent, ignoreClass) {
        var selector = getSelectorData(element, maxParent, ignoreClass);
        return selectorToString(selector) + ":visible";
    }
    function getSelectorData(element, maxParent, ignoreClass) {
        if (!element) {
            return "";
        }
        maxParent = maxParent || document;
        return {
            element: element,
            ignoreClass: ignoreClass,
            maxParent: maxParent,
            classes: getClasses(element, ignoreClass),
            type: element.nodeName.toLowerCase(),
            parent: getParentSelector(element, maxParent, ignoreClass)
        };
    }
    function getClasses(element, ignoreClass) {
        return ux.filter(element.classList, ignoreClass);
    }
    function selectorToString(selector, depth) {
        var matches, str;
        depth = depth || 0;
        str = selector ? selectorToString(selector.parent, depth + 1) : "";
        if (selector) {
            str += (str.length ? " " : "") + selector.type + (selector.classes.length ? "." + selector.classes.join(".") : "");
        }
        if (!depth) {
            matches = selector.maxParent.querySelectorAll(str);
            if (matches.length > 1) {
                str += ":eq(" + getIndexOfTarget(matches, selector.element) + ")";
            }
        }
        return str;
    }
    function getParentSelector(element, maxParent, ignoreClass) {
        var parent = element.parentNode;
        if (parent && parent !== maxParent) {
            return getSelectorData(element.parentNode, maxParent, ignoreClass);
        }
        return null;
    }
    function getIndexOfTarget(list, element) {
        var i, iLen = list.length;
        for (i = 0; i < iLen; i += 1) {
            if (element === list[i]) {
                return i;
            }
        }
        return -1;
    }
    return {
        getSelector: getSelector
    };
}();

exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME = "ux-datagrid:focusToPrevElementOfSame";

exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME = "ux-datagrid:focusToNextElementOfSame";

/**
 * Handle focus for enterKey to move down the correct columns.
 */
angular.module("ux").factory("gridFocusManager", function() {
    return function(inst) {
        /**
         * We want to add and remove listeners only on the dom that is currently under watch.
         */
        var result = {}, unwatchers = [];
        function wrap(el) {
            if (el.length === undefined) {
                el = angular.element(el);
            }
            return el;
        }
        /**
         * Add all of the listeners to the visible rows.
         */
        function addListeners() {
            applyToListeners(addListenersToRow);
        }
        /**
         * remove all of the listeners from min to max.
         */
        function removeListeners() {
            // this needs executed before the activeRange changes.
            applyToListeners(removeListenersToRow);
        }
        /**
         * using the inst.activeRange.min/max apply methods to those rows.
         * @param method
         */
        function applyToListeners(method) {
            if (!inst.values.activeRange.max) {
                return;
            }
            var i = inst.values.activeRange.min, row;
            while (i <= inst.values.activeRange.max) {
                row = inst.getRowElm(i);
                method(row);
                i += 1;
            }
        }
        /**
         * Get all of the focusable elements within an element
         * @param el
         * @returns {Array}
         */
        function getFocusableElements(el) {
            var focusable = [].slice.call(el[0].querySelectorAll("input,a,select"));
            return ux.filter(focusable, filterVisible);
        }
        /**
         * Filter the elements in the selection to only get those that are visible.
         * @param item
         * @returns {*}
         */
        function filterVisible(item) {
            return ux.visibility.isVisible(item);
        }
        /**
         * Move up the dom to determine the row of an element.
         * @param el
         * @returns {*}
         */
        function getRowElmFromChildElm(el) {
            // keep moving up until the parent is a chunk.
            var parent = el.parent();
            while (parent && !parent.hasClass(inst.options.chunkClass)) {
                el = parent;
                parent = el.parent();
            }
            return el;
        }
        /**
         * Similar to jquery find.
         * @param el
         * @param selector
         * @returns {element|*}
         */
        function query(el, selector) {
            var filters = selector.split(":"), sel = filters.shift(), result = [].slice.call((el[0] || el).querySelectorAll(sel));
            while (filters.length) {
                result = filterSelection(filters.shift(), result);
            }
            return angular.element(result);
        }
        /**
         * Apply filters to the selection array.
         * @param filterStr
         * @param elements
         * @returns {*}
         */
        function filterSelection(filterStr, elements) {
            if (filterStr.substr(0, 3) === "eq(") {
                return filterEq(filterStr, elements);
            } else if (filterStr.substr(0, 7) === "visible") {
                return ux.filter(elements, filterVisible);
            }
            return elements;
        }
        /**
         * Filter for eq.
         * @param filterStr
         * @param elements
         * @returns {Array}
         */
        function filterEq(filterStr, elements) {
            var index = filterStr.match(/\d+/)[0];
            return elements[index] ? [ elements[index] ] : [];
        }
        /**
         * Detect if is an ng-* class from the selectors.
         * @param cls
         * @returns {boolean}
         */
        function isNgClass(cls) {
            return !!(cls && cls.substr(0, 3) === "ng-");
        }
        function filterClasses(cls) {
            var isToBeFiltered = cls ? false : true;
            if (!isToBeFiltered && inst.options.gridFocusManager && inst.options.gridFocusManager.filterClasses) {
                isToBeFiltered = inst.options.gridFocusManager.filterClasses.indexOf(cls) !== -1;
            }
            if (!isToBeFiltered) {
                isToBeFiltered = isNgClass(cls);
            }
            return !isToBeFiltered;
        }
        /**
         * Apply event listeners to the row.
         * @param rowElm
         */
        function addListenersToRow(rowElm) {
            var focusable = getFocusableElements(rowElm);
            if (focusable.length) {
                focusable = angular.element(focusable);
                focusable.bind("keydown", onKeyDown);
            }
        }
        /**
         * Remove event listeners from that row.
         * @param rowElm
         */
        function removeListenersToRow(rowElm) {
            var focusable = getFocusableElements(rowElm);
            if (focusable.length) {
                focusable = angular.element(focusable);
                focusable.unbind("keydown", onKeyDown);
            }
        }
        /**
         * Handle Enter, up/down key events.
         * @param event
         */
        function onKeyDown(event) {
            var target = angular.element(event.currentTarget);
            inst.flow.log("FM: onKeyDown");
            if (event.shiftKey && event.keyCode === 13 || event.keyCode === 38) {
                // SHIFT+ENTER, UP ARROW
                focusToPrevRowElement(target);
            } else if (event.keyCode === 13 || event.keyCode === 40) {
                // ENTER, DOWN ARROW
                focusToNextRowElement(target);
            }
        }
        /**
         * Focus to the previous row element from the current focused element.
         * @param focusedEl
         */
        function focusToPrevRowElement(focusedEl) {
            var focusEl = getPrevRowFocusElement(focusedEl, -1);
            performFocus(focusEl);
        }
        /**
         * Focus to the next row element from the current focused element.
         * @param focusedEl
         */
        function focusToNextRowElement(focusedEl) {
            inst.flow.log("	FM: focusToNextRowElement");
            var focusEl = getNextRowFocusElement(focusedEl);
            performFocus(focusEl);
        }
        function hasPrevRowFocusElement(focusedEl) {
            var el = getPrevRowFocusElement(focusedEl);
            return !!(el && el.length);
        }
        function hasNextRowFocusElement(focusedEl) {
            var el = getNextRowFocusElement(focusedEl);
            return !!(el && el.length);
        }
        function getPrevRowFocusElement(focusedEl) {
            return focusToRowElement(focusedEl, -1);
        }
        function getNextRowFocusElement(focusedEl) {
            inst.flow.log("	FM: getNextRowFocusElement");
            return focusToRowElement(focusedEl, 1);
        }
        /**
         * Do the heavy lifting for focusing from one row to the next and pulling the selector.
         * Since it is the same going to previous or next it is all one method and just needs to know which direction
         * to increment.
         * @param focusedEl
         * @param dir
         */
        function focusToRowElement(focusedEl, dir) {
            // dir should be 1 or -1
            inst.flow.log("	FM: focusToRowElement");
            focusedEl = wrap(focusedEl);
            if (!inst.element[0].contains(focusedEl[0])) {
                return;
            }
            var resultEl, rowEl = getRowElmFromChildElm(focusedEl), currentIndex = inst.getRowIndexFromElement(focusedEl), nextIndex = currentIndex + dir, selector;
            if (nextIndex < 0 || nextIndex >= inst.rowsLength) {
                return focusedEl;
            }
            selector = ux.selector.getSelector(focusedEl[0], rowEl[0], filterClasses);
            inst.flow.log("	FM: selector: %s", selector);
            resultEl = findNextRowWithSelection(nextIndex, dir, selector);
            return resultEl && resultEl.length ? resultEl : focusedEl;
        }
        /**
         * Do the actual focus. Select the text if select exists.
         * @param focusEl
         */
        function performFocus(focusEl) {
            inst.flow.log("	FM: performFocus %o", focusEl[0]);
            if (focusEl[0].select) {
                // TODO: if no jquery. There may be no select.
                focusEl[0].select();
            }
            if (focusEl[0]) {
                focusEl[0].focus();
            }
            // we now need to scroll the row into view if it is not.
            inst.scrollModel.scrollIntoView(inst.getRowIndexFromElement(focusEl), true);
        }
        /**
         * Find the next row that has a matching selection. If one is not found it will no focus.
         * Since a creep render happens after every scroll it should not have difficulty finding a row.
         * However, possible bug here if a selector similar to this one doesn't exist for a large distance.
         * @param nextIndex
         * @param dir
         * @param selector
         * @returns {element|*}
         */
        function findNextRowWithSelection(nextIndex, dir, selector) {
            inst.flow.log("	FM: findNextRowWithSelection");
            var nextEl = inst.getRowElm(nextIndex), focusEl = query(nextEl[0], selector);
            var content = inst.getContent();
            while (!focusEl[0] && (dir > 0 && nextIndex < inst.rowsLength - 1 || dir < 0 && nextIndex > 0)) {
                nextIndex += dir;
                nextEl = inst.getRowElm(nextIndex);
                if (nextEl[0] === content) {
                    return;
                }
                focusEl = query(nextEl[0], selector);
            }
            return focusEl;
        }
        result.hasPrevRowFocusElement = hasPrevRowFocusElement;
        result.hasNextRowFocusElement = hasNextRowFocusElement;
        result.focusToPrevRowElement = focusToPrevRowElement;
        result.focusToNextRowElement = focusToNextRowElement;
        result.query = query;
        result.destroy = function destroy() {
            while (unwatchers.length) {
                unwatchers.pop()();
            }
            unwatchers = null;
            result = null;
        };
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_RESET, removeListeners));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_UPDATE_WATCHERS, removeListeners));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_UPDATE_WATCHERS, addListeners));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME, function() {
            focusToPrevRowElement(document.activeElement);
        }));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME, function() {
            focusToNextRowElement(document.activeElement);
        }));
        inst.gridFocusManager = result;
        return inst;
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
