/*
* uxDatagrid v.0.5.2
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
/*global exports */
/**
 * ##<a name="visibility">ux.visibility</a>##
 * Determines simplistic element visibility.
 */
exports.visibility = function() {
    /**
     * ###<a name="isVisible">isVisible</a>###
     * Checks if a DOM element is visible. Takes into consideration its parents.
     * @param {DOMElement} el the DOMElement to check if is visible
     * @param {maxParent} when max parent is reached it will stop.
     * @param {allowOpacity=} if true then opacity will not return a false if it is 0.
     */
    function isVisible(el, maxParent, allowOpacity) {
        var p = el.parentNode;
        if (!elementInDocument(el)) {
            return false;
        }
        if (9 === p.nodeType) {
            // Return true for document node
            return true;
        }
        // Return false if our element is invisible
        if (!allowOpacity && getStyle(el, "opacity") === "0") {
            return false;
        }
        if ("none" === getStyle(el, "display") || "hidden" === getStyle(el, "visibility")) {
            return false;
        }
        if (p && p !== maxParent) {
            //-- If we have a parent, let's continue:
            //-- Let's recursively check upwards:
            return isVisible(p, maxParent, allowOpacity);
        }
        return true;
    }
    /**
     * ###<a name="getStyle">getStyle</a>###
     * Cross browser method to get style properties.
     * @param {DOMElement} el
     * @param {String} property
     * @returns {*}
     */
    function getStyle(el, property) {
        if (window.getComputedStyle) {
            return document.defaultView.getComputedStyle(el, null)[property];
        }
        if (el.currentStyle) {
            return el.currentStyle[property];
        }
        return undefined;
    }
    /**
     * ###<a name="elementInDocument">elementInDocument</a>###
     * @param {DOMElement} element
     * @returns {boolean}
     */
    function elementInDocument(element) {
        while (element = element.parentNode) {
            if (element == document) {
                return true;
            }
        }
        return false;
    }
    return {
        getStyle: getStyle,
        isVisible: isVisible
    };
}();

/*global exports */
exports.selector = function() {
    //TODO: Needs unit tests. This needs jquery to run unit tests for selections since it uses filters.
    /**
     * ##getCleanSelector##
     * Generate a clean readable selector. This is accurate, but NOT performant.
     * @param {DOMElement} el
     * @param {Array} ignoreClasses - an array of strings or regExp
     */
    function getCleanSelector(el, ignoreClass) {
        var ignore = buildIgnoreFunction(ignoreClass), matches, index, str, selector = getSelectorData(el, document.body, ignore, null, true);
        while (selector.count > selector.totalCount) {
            selector = selector.parent;
        }
        selector = selector.parent || selector;
        // once we find the top level. we need to move up one.
        str = selector.relativeSelector;
        if (selector.count > 1) {
            matches = exports.util.array.toArray(selector.maxParent.querySelectorAll(selector.relativeSelector));
            index = matches.indexOf(el);
            str += ":eq(" + index + ")";
        }
        str += ":visible";
        return str;
    }
    /**
     * ##<a name="getSelector">getSelector</a>##
     * build the string selector for the element. This is more performant, but hardly readable.
     * @param {DomElement} element
     * @param {DomElement=} maxParent
     * @param {Function=} ignoreClass
     * @returns {string}
     */
    function getSelector(element, maxParent, ignoreClass) {
        var ignore = buildIgnoreFunction(ignoreClass), selector = getSelectorData(element, maxParent, ignore);
        return selectorToString(selector) + ":visible";
    }
    function matchesClass(item, matcher) {
        if (typeof matcher === "string" && matcher === item) {
            return true;
        }
        if (typeof matcher === "object" && item.match(matcher)) {
            return true;
        }
        return false;
    }
    function getSelectorData(element, maxParent, ignoreClass, child, detailed) {
        var result;
        if (!element) {
            return "";
        }
        maxParent = maxParent || document;
        result = {
            element: element,
            ignoreClass: ignoreClass,
            maxParent: maxParent,
            classes: getClasses(element, ignoreClass),
            type: element.nodeName && element.nodeName.toLowerCase() || "",
            child: child
        };
        if (detailed && element.nodeType >= 1) {
            result.relativeSelector = getSelectorString(result) + (result.child ? " " + result.child.relativeSelector : "");
            //selectorToString(result, 0, result.parent);
            result.count = result.maxParent.querySelectorAll(result.relativeSelector).length;
            var tmp = result;
            while (tmp.child) {
                tmp = tmp.child;
                tmp.totalCount = result.count;
            }
        }
        result.parent = getParentSelector(element, maxParent, ignoreClass, result, detailed);
        return result;
    }
    function filterNumbers(item) {
        return typeof item !== "number";
    }
    function buildIgnoreFunction(ignoreClasses) {
        if (typeof ignoreClasses === "function") {
            return ignoreClasses;
        }
        return function(cls) {
            if (ignoreClasses instanceof Array) {
                var i = 0, iLen = ignoreClasses.length;
                while (i < iLen) {
                    if (matchesClass(cls, ignoreClasses[i])) {
                        return false;
                    }
                    i += 1;
                }
            } else if (matchesClass(cls, ignoreClasses)) {
                return false;
            }
            return true;
        };
    }
    function getClasses(element, ignoreClass) {
        var classes = ux.filter(element.classList, filterNumbers);
        return ux.filter(classes, ignoreClass);
    }
    function selectorToString(selector, depth, overrideMaxParent) {
        var matches, str, parent;
        depth = depth || 0;
        str = selector ? selectorToString(selector.parent, depth + 1) : "";
        if (selector) {
            str += (str.length ? " " : "") + getSelectorString(selector);
        }
        if (!depth) {
            parent = overrideMaxParent || selector.maxParent;
            matches = parent.querySelectorAll && parent.querySelectorAll(str) || [];
            if (matches.length > 1) {
                str += ":eq(" + getIndexOfTarget(matches, selector.element) + ")";
            }
        }
        return str;
    }
    function getSelectorString(selector) {
        return selector.type + (selector.classes.length ? "." + selector.classes.join(".") : "");
    }
    function getParentSelector(element, maxParent, ignoreClass, child, detailed) {
        var parent = element.parentNode;
        if (parent && parent !== maxParent) {
            return getSelectorData(element.parentNode, maxParent, ignoreClass, child, detailed);
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
        getCleanSelector: getCleanSelector,
        getSelector: getSelector
    };
}();

exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME = "ux-datagrid:focusToPrevElementOfSame";

exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME = "ux-datagrid:focusToNextElementOfSame";

exports.datagrid.events.ON_SCROLL_TO_TOP_ENTER = "ux-datagrid:onScrollToTopEnter";

exports.datagrid.events.ON_SCROLL_TO_BOTTOM_ENTER = "ux-datagrid:onScrollToBottomEnter";

/**
 * ##<a name="gridFocusManager">gridFocusManager</a>##
 * Handle focus for enterKey to move down the correct columns.
 * > _**Note:** One of the most common mistakes when implementing this is to have classes that are applied on focus.
 * > Those get picked up in the selectors and then when it tries to find them in the next row they do not
 * > match because they are not focused or selected yet. You can easily get around this by applying [filterClasses](#filterClasses).
 * > [filterClasses](#filterClasses) are defined in the options of the datagrid._
 * > `data-options="{gridFocusManger: {filterClasses: ['focused','selected']}}"`
 *
 */
angular.module("ux").factory("gridFocusManager", function() {
    return function(inst) {
        /**
         * We want to add and remove listeners only on the dom that is currently under watch.
         */
        var result = exports.logWrapper("gridFocusManager", {}, "redOrange", inst.dispatch), unwatchers = [], keys = {
            ENTER: 13,
            UP: 38,
            DOWN: 40
        };
        /**
         * ###<a name="wrap">wrap</a>###
         * if an element is not a JQLite element then make it one.
         * @param {JQLite|DOMElement} el
         * @returns {JQLite}
         */
        function wrap(el) {
            if (el.length === undefined) {
                el = angular.element(el);
            }
            return el;
        }
        /**
         * ###<a name="addListeners">addListeners</a>###
         * Add all of the listeners to the visible rows.
         */
        function addListeners() {
            result.log("addListeners");
            applyToListeners(addListenersToRow);
        }
        /**
         * ###<a name="removeListeners">removeListeners</a>###
         * remove all of the listeners from min to max.
         */
        function removeListeners() {
            // this needs executed before the activeRange changes.
            result.log("removeListeners");
            applyToListeners(removeListenersToRow);
        }
        /**
         * ###<a name="applyToListeners">applyToListeners</a>###
         * using the inst.activeRange.min/max apply methods to those rows.
         * @param {Function} method
         */
        function applyToListeners(method) {
            if (!inst.values.activeRange.max || inst.values.activeRange.max < 0) {
                return;
            }
            result.log("	applyTo: %s - %s", inst.values.activeRange.min, inst.values.activeRange.max);
            var i = inst.values.activeRange.min, row;
            while (i <= inst.values.activeRange.max) {
                row = inst.getRowElm(i);
                method(row);
                i += 1;
            }
        }
        /**
         * ###<a name="getFocusableElements">getFocusableElements</a>###
         * Get all of the focusable elements within an element
         * @param {JQLite} el
         * @returns {Array}
         */
        function getFocusableElements(el) {
            var focusable = [].slice.call(el[0].querySelectorAll("input,a,select"));
            result.log("	getFocusableElements %s", focusable.length);
            return ux.filter(focusable, filterVisible);
        }
        /**
         * ###<a name="filterVisible">filterVisible</a>###
         * Filter the elements in the selection to only get those that are visible.
         * @param {DOMElement} el
         * @returns {*}
         */
        function filterVisible(el) {
            result.log("		isVisible %s", ux.visibility.isVisible(el));
            return ux.visibility.isVisible(el, inst.getContent()[0], true);
        }
        /**
         * ###<a name="getRowElmFromChildElm">getRowElmFromChildElm</a>###
         * Move up the dom to determine the row of an element.
         * @param {JQLite} el
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
         * ###<a name="query">query</a>###
         * Similar to jquery find.
         * @param {JQLite|DOMElement} el
         * @param {String} selector
         * @returns {JQLite}
         */
        function query(el, selector) {
            var filters = selector.split(":"), sel = filters.shift(), result = [].slice.call((el[0] || el).querySelectorAll(sel));
            while (filters.length) {
                result = filterSelection(filters.shift(), result);
            }
            return angular.element(result);
        }
        /**
         * ###<a name="filterSelection">filterSelection</a>###
         * Apply filters to the selection array.
         * @param {String} filterStr
         * @param {Array} elements
         * @returns {Array}
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
         * ###<a name="filterEq">filterEq</a>###
         * Filter for eq.
         * @param {String} filterStr
         * @param {Array} elements
         * @returns {Array}
         */
        function filterEq(filterStr, elements) {
            var index = filterStr.match(/\d+/)[0];
            return elements[index] ? [ elements[index] ] : [];
        }
        /**
         * ###<a name="isNgClass">isNgClass</a>###
         * Detect if is an ng-* class from the selectors.
         * @param {String} cls
         * @returns {boolean}
         */
        function isNgClass(cls) {
            return !!(cls && cls.substr(0, 3) === "ng-");
        }
        /**
         * ###<a name="filterClasses">filterClasses</a>###
         * Filter out classes that are not supposed to be part of the selection.
         * By defining options.gridFocusManager.filterClasses as an array of class names to omit from the selection
         * you can filter these out from causing selections to not be made.
         * @param {String} cls
         * @returns {boolean}
         */
        //      <div ux-datagrid="items" addons="gridFocusManager" options="{gridFocusManager: {filterClasses: ['focus','selected','highlight']}}">...</div>
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
         * ###<a name="addListenersToRow">addListenersToRow</a>###
         * Apply event listeners to the row.
         * @param {JQLite|DOMElement} rowElm
         */
        function addListenersToRow(rowElm) {
            var focusable = getFocusableElements(angular.element(rowElm));
            if (focusable.length) {
                result.log("		addListenersToRow");
                focusable = angular.element(focusable);
                focusable.bind("keydown", onKeyDown);
            } else {
                result.log("		no focusable elements found in row");
            }
        }
        /**
         * ###<a name="removeListenersToRow">removeListenersToRow</a>###
         * Remove event listeners from that row.
         * @param {JQLite|DOMElement} rowElm
         */
        function removeListenersToRow(rowElm) {
            var focusable = getFocusableElements(angular.element(rowElm));
            if (focusable.length) {
                result.log("		removeListenersToRow");
                focusable = angular.element(focusable);
                focusable.unbind("keydown", onKeyDown);
            } else {
                result.log("		no focusable elements found in row");
            }
        }
        /**
         * ###<a name="onKeyDown">onKeyDown</a>###
         * Handle Enter, up/down key events.
         * @param {Event} event
         */
        function onKeyDown(event) {
            var target = angular.element(event.currentTarget), atTop = false, atBottom = false;
            result.log("FM: onKeyDown");
            if (event.shiftKey && event.keyCode === keys.ENTER || event.keyCode === keys.UP) {
                atTop = !focusToPrevRowElement(target);
                if (atTop) {
                    inst.dispatch(exports.datagrid.events.ON_SCROLL_TO_TOP_ENTER);
                }
            } else if (event.keyCode === keys.ENTER || event.keyCode === keys.DOWN) {
                atBottom = !focusToNextRowElement(target);
                if (atBottom) {
                    inst.dispatch(exports.datagrid.events.ON_SCROLL_TO_BOTTOM_ENTER);
                }
            }
        }
        /**
         * ###<a name="focusToPrevRowElement">focusToPrevRowElement</a>###
         * Focus to the previous row element from the current focused element.
         * @param {JQLite} focusedEl
         */
        function focusToPrevRowElement(focusedEl) {
            var focusEl = getPrevRowFocusElement(focusedEl, -1);
            if (isSame(focusEl, focusedEl)) {
                return false;
            }
            return performFocus(focusEl);
        }
        /**
         * ###<a name="focusToNextRowElement">focusToNextRowElement</a>###
         * Focus to the next row element from the current focused element.
         * @param {JQLite} focusedEl
         */
        function focusToNextRowElement(focusedEl) {
            var focusEl = getNextRowFocusElement(focusedEl);
            if (isSame(focusEl, focusedEl)) {
                return false;
            }
            return performFocus(focusEl);
        }
        /**
         * ###<a name="isSame">isSame</a>###
         * Compare to JQLite/DOMElements objects to see if they reference the same DOMElement.
         * @param {JQLite|DOMElement} el
         * @param {JQLite|DOMElement} el2
         * @returns {boolean}
         */
        function isSame(el, el2) {
            return (el[0] || el) === (el2[0] || el2);
        }
        /**
         * ###<a name="hasPrevRowFocusElement">hasPrevRowFocusElement</a>###
         * check to see if the previous row has the same selector which is derived from the focusedEl
         * @param {DOMElement} focusedEl
         * @returns {boolean}
         */
        function hasPrevRowFocusElement(focusedEl) {
            var el = getPrevRowFocusElement(focusedEl);
            return !!(el && el.length && el[0] !== focusedEl);
        }
        /**
         * ###<a name="hasNextRowFocusElement">hasNextRowFocusElement</a>###
         * check to see if the next row has the same selector which is derived from the focusedEl
         * @param {DOMElement} focusedEl
         * @returns {boolean}
         */
        function hasNextRowFocusElement(focusedEl) {
            var el = getNextRowFocusElement(focusedEl);
            return !!(el && el.length && el[0] !== focusedEl);
        }
        /**
         * ###<a name="getPrevRowFocusElement">getPrevRowFocusElement</a>###
         * get the previous row and check for the focusedEl selector.
         * @param {JQLite} focusedEl
         * @returns {*}
         */
        function getPrevRowFocusElement(focusedEl) {
            return focusToRowElement(focusedEl, -1);
        }
        /**
         * ###<a name="getNextRowFocusElement">getNextRowFocusElement</a>###
         * @param {JQLite} focusedEl
         * @returns {*}
         */
        function getNextRowFocusElement(focusedEl) {
            result.log("	FM: getNextRowFocusElement");
            return focusToRowElement(focusedEl, 1);
        }
        /**
         * ###<a name="focusToRowElment">focusToRowElement</a>###
         * Do the heavy lifting for focusing from one row to the next and pulling the selector.
         * Since it is the same going to previous or next it is all one method and just needs to know which direction
         * to increment.
         * @param {JQLite} focusedEl
         * @param {Number} dir
         */
        function focusToRowElement(focusedEl, dir) {
            // dir should be 1 or -1
            result.log("	focusToRowElement");
            focusedEl = wrap(focusedEl);
            if (!inst.element[0].contains(focusedEl[0])) {
                return;
            }
            var resultEl, currentIndex = inst.getRowIndexFromElement(focusedEl), rowEl = inst.getRowElm(currentIndex), nextIndex = currentIndex + dir, selector;
            if (nextIndex < 0 || nextIndex >= inst.rowsLength) {
                return focusedEl;
            }
            selector = ux.selector.getSelector(focusedEl[0], rowEl[0], filterClasses);
            result.log("	selector: %s", selector);
            resultEl = findNextRowWithSelection(nextIndex, dir, selector);
            return resultEl && resultEl.length ? resultEl : focusedEl;
        }
        /**
         * ###<a name="performFocus">performFocus</a>###
         * Do the actual focus. Select the text if select exists.
         * @param {JQLite} focusEl
         */
        function performFocus(focusEl) {
            result.log("	performFocus %o", focusEl[0]);
            var success = false;
            if (focusEl[0].select) {
                // TODO: if no jquery. There may be no select.
                focusEl[0].select();
            }
            if (focusEl[0]) {
                focusEl[0].focus();
                success = true;
            }
            // we now need to scroll the row into view if it is not.
            inst.scrollModel.scrollIntoView(inst.getRowIndexFromElement(focusEl), true);
            return success;
        }
        /**
         * ###<a name="findNextRowWithSelection">findNextRowWithSelection</a>###
         * Find the next row that has a matching selection. If one is not found it will no focus.
         * Since a creep render happens after every scroll it should not have difficulty finding a row.
         * However, possible bug here if a selector similar to this one doesn't exist for a large distance.
         * @param {Number} nextIndex
         * @param {Number} dir
         * @param {String} selector
         * @returns {JQLite}
         */
        function findNextRowWithSelection(nextIndex, dir, selector) {
            result.log("	findNextRowWithSelection");
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
        function onResize(event) {
            var index;
            if (inst.element[0].contains(document.activeElement)) {
                index = inst.getRowIndexFromElement(document.activeElement);
                inst.scrollModel.scrollIntoView(index);
            }
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
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_RENDER, removeListeners));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_RENDER, addListeners));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME, function() {
            if (inst.element[0].contains(document.activeElement)) {
                focusToPrevRowElement(document.activeElement);
            }
        }));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME, function() {
            if (inst.element[0].contains(document.activeElement)) {
                focusToNextRowElement(document.activeElement);
            }
        }));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_HEIGHTS_UPDATED_RENDER, onResize));
        inst.gridFocusManager = result;
        return inst;
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
