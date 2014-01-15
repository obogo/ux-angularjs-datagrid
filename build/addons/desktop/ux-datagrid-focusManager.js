/*
* uxDatagrid v.0.2.0
* (c) 2014, WebUX
* License: MIT.
*/
(function(exports, global){
exports.visibility = function() {
    function _isVisible(el, t, r, b, l, w, h) {
        var p = el.parentNode, VISIBLE_PADDING = 2;
        if (!_elementInDocument(el)) {
            return false;
        }
        if (9 === p.nodeType) {
            return true;
        }
        if ("0" === _getStyle(el, "opacity") || "none" === _getStyle(el, "display") || "hidden" === _getStyle(el, "visibility")) {
            return false;
        }
        if (p) {
            return _isVisible(p, t, r, b, l, w, h);
        }
        return true;
    }
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

exports.selector = function() {
    var $ = $ || angular.element;
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

angular.module("ux").factory("gridFocusManager", function() {
    return function(exp) {
        var result = {}, unwatchers = [];
        function wrap(el) {
            if (el.length === undefined) {
                el = angular.element(el);
            }
            return el;
        }
        function addListeners() {
            applyToListeners(addListenersToRow);
        }
        function removeListeners() {
            applyToListeners(removeListenersToRow);
        }
        function applyToListeners(method) {
            var i = exp.values.activeRange.min, row;
            while (i <= exp.values.activeRange.max) {
                row = exp.getRowElm(i);
                method(row);
                i += 1;
            }
        }
        function getFocusableElements(el) {
            var focusable = [].slice.call(el[0].querySelectorAll("input,a,select"));
            return ux.filter(focusable, filterVisible);
        }
        function filterVisible(item) {
            return ux.visibility.isVisible(item);
        }
        function getRowElmFromChildElm(el) {
            var parent = el.parent();
            while (parent && !parent.hasClass(exp.options.chunkClass)) {
                el = parent;
                parent = el.parent();
            }
            return el;
        }
        function query(el, selector) {
            var filters = selector.split(":"), sel = filters.shift(), result = [].slice.call((el[0] || el).querySelectorAll(sel));
            while (filters.length) {
                result = filterSelection(filters.shift(), result);
            }
            return angular.element(result);
        }
        function filterSelection(filterStr, elements) {
            if (filterStr.substr(0, 3) === "eq(") {
                return filterEq(filterStr, elements);
            } else if (filterStr.substr(0, 7) === "visible") {
                return ux.filter(elements, filterVisible);
            }
            return elements;
        }
        function filterEq(filterStr, elements) {
            var index = filterStr.match(/\d+/)[0];
            return elements[index] ? [ elements[index] ] : [];
        }
        function isNgClass(cls) {
            return !!(cls && cls.substr(0, 3) === "ng-");
        }
        function filterClasses(cls) {
            var isToBeFiltered = cls ? false : true;
            if (!isToBeFiltered && exp.options.gridFocusManager && exp.options.gridFocusManager.filterClasses) {
                isToBeFiltered = exp.options.gridFocusManager.filterClasses.indexOf(cls) !== -1;
            }
            if (!isToBeFiltered) {
                isToBeFiltered = isNgClass(cls);
            }
            return !isToBeFiltered;
        }
        function addListenersToRow(rowElm) {
            var focusable = getFocusableElements(rowElm);
            if (focusable.length) {
                focusable = angular.element(focusable);
                focusable.bind("keydown", onKeyDown);
            }
        }
        function removeListenersToRow(rowElm) {
            var focusable = getFocusableElements(rowElm);
            if (focusable.length) {
                focusable = angular.element(focusable);
                focusable.unbind("keydown", onKeyDown);
            }
        }
        function onKeyDown(event) {
            var target = angular.element(event.currentTarget);
            if (event.shiftKey && event.keyCode === 13 || event.keyCode === 38) {
                focusToPrevRowElement(target);
            } else if (event.keyCode === 13 || event.keyCode === 40) {
                focusToNextRowElement(target);
            }
        }
        function focusToPrevRowElement(focusedEl) {
            var focusEl = getPrevRowFocusElement(focusedEl, -1);
            performFocus(focusEl);
        }
        function focusToNextRowElement(focusedEl) {
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
            return focusToRowElement(focusedEl, 1);
        }
        function focusToRowElement(focusedEl, dir) {
            focusedEl = wrap(focusedEl);
            if (!exp.element[0].contains(focusedEl[0])) {
                return;
            }
            var resultEl, rowEl = getRowElmFromChildElm(focusedEl), currentIndex = exp.getRowIndexFromElement(focusedEl), nextIndex = currentIndex + dir, selector;
            if (nextIndex < 0 || nextIndex >= exp.rowsLength) {
                return focusedEl;
            }
            selector = ux.selector.getSelector(focusedEl[0], rowEl[0], filterClasses);
            resultEl = findNextRowWithSelection(nextIndex, dir, selector);
            return resultEl && resultEl.length ? resultEl : focusedEl;
        }
        function performFocus(focusEl) {
            if (focusEl[0].select) {
                focusEl[0].select();
            }
            if (focusEl[0]) {
                focusEl[0].focus();
            }
            exp.scrollModel.scrollIntoView(exp.getRowIndexFromElement(focusEl), true);
        }
        function findNextRowWithSelection(nextIndex, dir, selector) {
            var nextEl = exp.getRowElm(nextIndex), focusEl = query(nextEl[0], selector);
            var content = exp.getContent();
            while (!focusEl[0] && (dir > 0 && nextIndex < exp.rowsLength - 1 || dir < 0 && nextIndex > 0)) {
                nextIndex += dir;
                nextEl = exp.getRowElm(nextIndex);
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
        unwatchers.push(exp.scope.$on(exports.datagrid.events.BEFORE_UPDATE_WATCHERS, removeListeners));
        unwatchers.push(exp.scope.$on(exports.datagrid.events.AFTER_UPDATE_WATCHERS, addListeners));
        unwatchers.push(exp.scope.$on(exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME, function() {
            focusToPrevRowElement(document.activeElement);
        }));
        unwatchers.push(exp.scope.$on(exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME, function() {
            focusToNextRowElement(document.activeElement);
        }));
        exp.gridFocusManager = result;
        return exp;
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
