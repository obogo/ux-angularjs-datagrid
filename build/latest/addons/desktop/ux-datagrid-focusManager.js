/*!
* ux-angularjs-datagrid v.1.6.12
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
    var omitAttrs, uniqueAttrs, classFilters, classFiltersFctn, api, ngRx = /^ng-\w+/;
    function query(selectorStr, el) {
        el = el || api.config.doc.body;
        var rx = /:eq\((\d+)\)$/, match = selectorStr.match(rx), result, count;
        // filter out eq.
        if (match && match.length) {
            selectorStr = selectorStr.replace(rx, "");
            count = match[1];
        }
        result = el.querySelectorAll(selectorStr);
        if (result && count !== undefined) {
            return result[count];
        }
        return result;
    }
    /**
     * ##getCleanSelector##
     * Generate a clean readable selector. This is accurate, but NOT performant.
     * The reason this one takes longer is because it takes many queries as it goes to determine when it has
     * built a query that is unique enough trying to do this as early on as possible to keep it short.
     * @param {DOMElement} el
     * @param {Array} ignoreClasses - an array of strings or regExp
     */
    function getCleanSelector(el, ignoreClass) {
        if (validateEl(el)) {
            var ignore = buildIgnoreFunction(ignoreClass), matches, index, str, maxParent = api.config.doc.body, selector = getSelectorData(el, maxParent, ignore, null, true);
            while (selector.count > selector.totalCount) {
                selector = selector.parent;
            }
            selector = selector.parent || selector;
            // once we find the top level. we need to move up one.
            str = selector.str || selectorToString(selector);
            if (selector.str) {
                var child = selector.child;
                while (child) {
                    str += " " + child.str;
                    child = child.child;
                }
            }
            if (selector.count > 1 || selector.child && selector.child.count) {
                matches = exports.util.array.toArray(query(str, maxParent));
                index = matches.indexOf(el);
                str += ":eq(" + index + ")";
            }
            str += getVisible();
            return str;
        }
        return "";
    }
    /**
     * ##<a name="quickSelector">quickSelector</a>##
     * build the string selector for the element. This is more performant, but hardly readable.
     * It is faster because it doesn't check to determine how unique it is. It just keeps building until
     * it gets to the maxParent.
     * @param {DomElement} element
     * @param {DomElement=} maxParent
     * @param {Function=} ignoreClass
     * @returns {string}
     */
    function quickSelector(element, maxParent, ignoreClass) {
        if (validateEl(element)) {
            var ignore = buildIgnoreFunction(ignoreClass), selector = getSelectorData(element, maxParent, ignore);
            return selectorToString(selector) + getVisible();
        }
        return "";
    }
    function validateEl(el) {
        if (!el) {
            return "";
        }
        // we do not want jquery elements here. only HTMLElements
        if (el && el.length && el.nodeType === undefined) {
            exports.datagrid.throwError("selector can only build a selection to a single DOMElement. A list was passed.");
        }
        return true;
    }
    function getVisible() {
        return api.config.addVisible ? ":visible" : "";
    }
    function matchesClass(item, matcher) {
        if (typeof matcher === "string" && (matcher === item || ngRx.test(item))) {
            return true;
        }
        if (typeof matcher === "object" && item.match(matcher)) {
            return true;
        }
        return false;
    }
    function getSelectorData(element, maxParent, ignoreClass, child, smartSelector) {
        var result;
        if (!element) {
            return "";
        }
        maxParent = maxParent || api.config.doc;
        result = {
            element: element,
            ignoreClass: ignoreClass,
            maxParent: maxParent,
            classes: getClasses(element, ignoreClass),
            attributes: getAttributes(element, child),
            type: element.nodeName && element.nodeName.toLowerCase() || "",
            child: child
        };
        if (!result.attributes.$unique || child) {
            if (smartSelector) {
                result.str = selectorToString(result, 0, null, true);
                result.count = maxParent.querySelectorAll(result.str).length;
                if (result.count > 1) {
                    result.parent = getParentSelector(element, maxParent, ignoreClass, result, smartSelector);
                }
            } else {
                // dumb selector. keeps building it. Not checking to see if it is unique.
                result.parent = getParentSelector(element, maxParent, ignoreClass, result, smartSelector);
            }
        }
        return result;
    }
    function filterClasses(item) {
        return typeof item !== "number" && (typeof item === "string" && item.indexOf("{") === -1);
    }
    function buildIgnoreFunction(ignoreClasses) {
        ignoreClasses = ignoreClasses || [];
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
        var classes = ux.filter(element.classList, filterClasses);
        classes = ux.filter(classes, classFiltersFctn);
        return ux.filter(classes, ignoreClass);
    }
    function getAttributes(element, child) {
        var i = 0, len = element.attributes ? element.attributes.length : 0, attr, attributes = [], uniqueAttr = getUniqueAttribute(element.attributes);
        // first see if it has a unique attribute.
        if (uniqueAttr) {
            if (uniqueAttr.name === "id" && api.config.allowId) {
                attributes.push("#" + uniqueAttr.value);
            } else if (uniqueAttr.name !== "id") {
                attributes.push(createAttrStr(uniqueAttr));
            }
            if (attributes.length) {
                attributes.$unique = true;
                return attributes;
            }
        }
        if (api.config.allowAttributes) {
            while (i < len) {
                attr = element.attributes[i];
                if (!omitAttrs[attr.name] && !uniqueAttrs[attr.name]) {
                    attributes.push(createAttrStr(attr));
                }
                i += 1;
            }
        }
        return attributes;
    }
    function createAttrStr(attr) {
        return "[" + camelCase(attr.name) + "='" + escapeQuotes(attr.value) + "']";
    }
    function getUniqueAttribute(attributes) {
        var attr, i = 0, len = attributes ? attributes.length : 0, name;
        while (i < len) {
            attr = attributes[i];
            name = camelCase(attr.name);
            if (uniqueAttrs[name]) {
                return attr;
            }
            i += 1;
        }
        return null;
    }
    function camelCase(name) {
        var ary, i = 1, len;
        if (name.indexOf("-")) {
            ary = name.split("-");
            len = ary.length;
            while (i < len) {
                ary[i] = ary[i].charAt(0).toUpperCase() + ary[i].substr(1);
                i += 1;
            }
            name = ary.join("");
        }
        return name;
    }
    function escapeQuotes(str) {
        return str.replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    }
    function selectorToString(selector, depth, overrideMaxParent, skipCount) {
        var matches, str, parent;
        depth = depth || 0;
        str = selector && !selector.attributes.$unique ? selectorToString(selector.parent, depth + 1) : "";
        if (selector) {
            str += (str.length ? " " : "") + getSelectorString(selector);
        }
        if (!depth && !skipCount) {
            parent = overrideMaxParent || selector.maxParent;
            matches = parent.querySelectorAll && parent.querySelectorAll(str) || [];
            if (matches.length > 1) {
                str += ":eq(" + getIndexOfTarget(matches, selector.element) + ")";
            }
        }
        return str;
    }
    function getSelectorString(selector) {
        if (selector.attributes.$unique) {
            return selector.attributes[0];
        }
        return selector.type + selector.attributes.join("") + (selector.classes.length ? "." + selector.classes.join(".") : "");
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
    function getList(obj) {
        var ary = [], i;
        for (i in obj) {
            if (exports.util.apply(Object.prototype.hasOwnProperty, obj, [ i ])) {
                ary.push(obj[i]);
            }
        }
        return ary;
    }
    api = {
        config: {
            doc: window.document,
            allowId: true,
            allowAttributes: true,
            addVisible: false
        },
        // OMIT
        addOmitAttrs: function(name) {
            exports.each(arguments, function(name) {
                omitAttrs[name] = true;
            });
            return this;
        },
        removeOmitAttrs: function(name) {
            exports.each(arguments, function(name) {
                delete omitAttrs[name];
            });
            return this;
        },
        getOmitAttrs: function() {
            return getList(omitAttrs);
        },
        resetOmitAttrs: function() {
            omitAttrs = {
                class: true,
                style: true
            };
        },
        // UNIQUE
        addUniqueAttrs: function(name) {
            exports.each(arguments, function(name) {
                uniqueAttrs[name] = true;
            });
            return this;
        },
        removeUniqueAttrs: function(name) {
            exports.each(arguments, function(name) {
                delete uniqueAttrs[name];
            });
            return this;
        },
        getUniqueAttrs: function() {
            return getList(uniqueAttrs);
        },
        resetUniqueAttrs: function() {
            uniqueAttrs = {
                id: true,
                uid: true
            };
        },
        // CLASS OMIT OMIT FILTERS
        addClassOmitFilters: function() {
            exports.each(arguments, function(filter) {
                classFilters.push(filter);
            });
            classFiltersFctn = buildIgnoreFunction(classFilters);
            return this;
        },
        removeClassOmitFilters: function() {
            exports.each(arguments, function(filter) {
                var index = classFilters.indexOf(filter);
                if (index !== -1) {
                    classFilters.splice(index, 1);
                }
            });
            classFiltersFctn = buildIgnoreFunction(classFilters);
            return this;
        },
        getClassOmitFilters: function() {
            return classFilters.slice(0);
        },
        resetClassOmitFilters: function() {
            classFilters = [];
            classFiltersFctn = buildIgnoreFunction(classFilters);
        },
        get: getCleanSelector,
        getCleanSelector: getCleanSelector,
        quickSelector: quickSelector,
        reset: function() {
            api.resetOmitAttrs();
            api.resetUniqueAttrs();
            api.resetClassOmitFilters();
        }
    };
    api.reset();
    return api;
}();

exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME = "ux-datagrid:focusToPrevElementOfSame";

exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME = "ux-datagrid:focusToNextElementOfSame";

exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME_FAILURE = "ux-datagrid:focusToPrevElementOfSameFailure";

exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME_FAILURE = "ux-datagrid:focusToNextElementOfSameFailure";

exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME_FOUND = "ux-datagrid:focusToNextElementOfSameFound";

exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME_FOUND = "ux-datagrid:focusToNextElementOfSameFound";

exports.datagrid.events.ON_SCROLL_TO_TOP_ENTER = "ux-datagrid:onScrollToTopEnter";

exports.datagrid.events.ON_SCROLL_TO_BOTTOM_ENTER = "ux-datagrid:onScrollToBottomEnter";

/**
 * ##<a name="gridFocusManager">gridFocusManager</a>##
 * Handle focus for enterKey to move down the correct columns.
 * > _**Note:** One of the most common mistakes when implementing this is to have classes that are applied on focus.
 * > Those get picked up in the selectors and then when it tries to find them in the next row they do not
 * > match because they are not focused or selected yet. You can easily get around this by applying [filterClasses](#filterClasses).
 * > [filterClasses](#filterClasses) are defined in the options of the datagrid._
 * > `data-options="{gridFocusManger: {filterClasses: ['focused','selected']}, filterNextPattern:{available:true}}"`
 * The filterNextPattern is used to speed up the lookup to the next item in focus. So it can quickly find which item to
 * scroll to before having to make sure the item is compiled and has a selector. It takes a pattern to match on.
 * See https://github.com/obogo/hummingbird/blob/master/src/utils/validators/isMatch.js for options with this pattern.
 */
angular.module("ux").factory("gridFocusManager", function() {
    return [ "inst", function(inst) {
        /**
         * We want to add and remove listeners only on the dom that is currently under watch.
         */
        var result = exports.logWrapper("gridFocusManager", {}, "redOrange", inst), eqrx = /:eq\((\d+)\)/, unwatchers = [], keys = {
            ENTER: 13,
            UP: 38,
            DOWN: 40
        }, throttleIntv = 0, waitingForPrevFocusRetryUnwatch, waitingForNextFocusRetryUnwatch;
        /**
         * ###<a name="wrap">wrap</a>###
         * if an element is not a JQLite element then make it one.
         * @param {JQLite|HTMLElement} el
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
        function addListeners(event) {
            result.info("addListeners " + event && event.name || "");
            applyToListeners(addListenersToRow);
        }
        /**
         * ###<a name="removeListeners">removeListeners</a>###
         * remove all of the listeners from min to max.
         */
        function removeListeners(event) {
            // this needs executed before the activeRange changes.
            result.info("removeListeners " + event && event.name || "");
            applyToListeners(removeListenersToRow);
        }
        /**
         * ###<a name="applyToListeners">applyToListeners</a>###
         * using the inst.activeRange.min/max apply methods to those rows.
         * @param {Function} method
         */
        function applyToListeners(method) {
            if (isNaN(inst.values.activeRange.max) || inst.values.activeRange.max < 0) {
                return;
            }
            result.info("\tapplyTo: %s - %s", inst.values.activeRange.min, inst.values.activeRange.max);
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
            if (el && el[0]) {
                // detachDom and memoryOptimizer can cause this to be null at times.
                var focusable = [].slice.call(el[0].querySelectorAll("input,a,select"));
                //            result.log("\tgetFocusableElements %s", focusable.length);
                return focusable;
            }
            return [];
        }
        /**
         * ###<a name="filterVisible">filterVisible</a>###
         * Filter the elements in the selection to only get those that are visible.
         * @param {HTMLElement} el
         * @returns {*}
         */
        function filterVisible(el) {
            //            result.log("\t\tisVisible %s", ux.visibility.isVisible(el));
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
         * @param {JQLite|HTMLElement} el
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
         * @param {JQLite|HTMLElement} rowElm
         */
        function addListenersToRow(rowElm) {
            var focusable = getFocusableElements(angular.element(rowElm));
            if (focusable.length && (focusable = exports.util.matchAll(focusable, {
                nodeName: "INPUT"
            })).length) {
                // only add keydown to input fields
                result.log("\t\taddListenersToRow");
                focusable = angular.element(focusable);
                focusable.bind("keydown", onKeyDown);
            } else {
                result.log("\t\tno focusable elements found in row");
            }
        }
        /**
         * ###<a name="removeListenersToRow">removeListenersToRow</a>###
         * Remove event listeners from that row.
         * @param {JQLite|HTMLElement} rowElm
         */
        function removeListenersToRow(rowElm) {
            var focusable = getFocusableElements(angular.element(rowElm));
            if (focusable.length && (focusable = exports.util.matchAll(focusable, {
                nodeName: "INPUT"
            })).length) {
                // only add keydown to input fields
                result.log("\t\tremoveListenersToRow");
                focusable = angular.element(focusable);
                focusable.unbind("keydown", onKeyDown);
            } else {
                result.log("\t\tno focusable elements found in row");
            }
        }
        /**
         * ###<a name="onKeyDown">onKeyDown</a>###
         * Handle Enter, up/down key events.
         * @param {Event} event
         */
        function onKeyDown(event) {
            var target = angular.element(event.currentTarget), atTop = false, atBottom = false;
            var index;
            var item;
            result.log("FM: onKeyDown");
            if (event.keyCode === keys.ENTER && event.currentTarget.nodeName.match(/A/)) {
                // on anchors we allow enter to execute it. So ignore it.
                return;
            }
            if (event.shiftKey && event.keyCode === keys.ENTER || event.keyCode === keys.UP) {
                atTop = !focusToPrevRowElement(target);
                if (atTop) {
                    index = inst.getRowIndexFromElement(target);
                    item = inst.getRowItem(index);
                    inst.dispatch(exports.datagrid.events.ON_SCROLL_TO_TOP_ENTER, index, item);
                }
            } else if (event.keyCode === keys.ENTER || event.keyCode === keys.DOWN) {
                atBottom = !focusToNextRowElement(target);
                if (atBottom) {
                    index = inst.getRowIndexFromElement(target);
                    item = inst.getRowItem(index);
                    inst.dispatch(exports.datagrid.events.ON_SCROLL_TO_BOTTOM_ENTER, index, item);
                }
            }
        }
        /**
         * ###<a name="focusToPrevRowElement">focusToPrevRowElement</a>###
         * Focus to the previous row element from the current focused element.
         * @param {JQLite} focusedEl
         * @param {Function=} isAvailable
         */
        function focusToPrevRowElement(focusedEl, isAvailable) {
            var focusEl = getPrevRowFocusElement(focusedEl, isAvailable);
            if (isSame(focusEl, focusedEl)) {
                return false;
            }
            return performFocus(focusEl);
        }
        /**
         * ###<a name="focusToNextRowElement">focusToNextRowElement</a>###
         * Focus to the next row element from the current focused element.
         * @param {JQLite} focusedEl
         * @param {Function=} isAvailable
         */
        function focusToNextRowElement(focusedEl, isAvailable) {
            var focusEl = getNextRowFocusElement(focusedEl, isAvailable);
            if (isSame(focusEl, focusedEl)) {
                return false;
            }
            return performFocus(focusEl);
        }
        /**
         * ###<a name="isSame">isSame</a>###
         * Compare to JQLite/HTMLElements objects to see if they reference the same HTMLElement.
         * @param {JQLite|HTMLElement} el
         * @param {JQLite|HTMLElement} el2
         * @returns {boolean}
         */
        function isSame(el, el2) {
            return (el[0] || el) === (el2[0] || el2);
        }
        /**
         * ###<a name="hasPrevRowFocusElement">hasPrevRowFocusElement</a>###
         * check to see if the previous row has the same selector which is derived from the focusedEl
         * @param {HTMLElement} focusedEl
         * @returns {boolean}
         */
        function hasPrevRowFocusElement(focusedEl, isAvailable) {
            if (isAvailable) {
                var d = inst.getData();
                for (var i = inst.getRowIndexFromElement(focusedEl) - 1; i >= 0; i -= 1) {
                    if (isAvailable(d[i])) {
                        return true;
                    }
                }
                if (!inst.options.gridFocusManager || !inst.options.gridFocusManager.multipleEnterFocusPerRow) {
                    return false;
                }
            }
            var el = getPrevRowFocusElement(focusedEl, isAvailable);
            return !!(el && el.length && el[0] !== focusedEl);
        }
        /**
         * ###<a name="hasNextRowFocusElement">hasNextRowFocusElement</a>###
         * check to see if the next row has the same selector which is derived from the focusedEl
         * @param {HTMLElement} focusedEl
         * @returns {boolean}
         */
        function hasNextRowFocusElement(focusedEl, isAvailable) {
            if (isAvailable) {
                var d = inst.getData();
                for (var i = inst.getRowIndexFromElement(focusedEl) + 1; i < inst.rowsLength; i += 1) {
                    if (isAvailable(d[i])) {
                        return true;
                    }
                }
                if (!inst.options.gridFocusManager || !inst.options.gridFocusManager.multipleEnterFocusPerRow) {
                    return false;
                }
            }
            var el = getNextRowFocusElement(focusedEl, isAvailable);
            return !!(el && el.length && el[0] !== focusedEl);
        }
        /**
         * ###<a name="getPrevRowFocusElement">getPrevRowFocusElement</a>###
         * get the previous row and check for the focusedEl selector.
         * @param {JQLite} focusedEl
         * @param {Function=} isAvailable
         * @returns {*}
         */
        function getPrevRowFocusElement(focusedEl, isAvailable) {
            return focusToRowElement(focusedEl, -1, isAvailable);
        }
        /**
         * ###<a name="getNextRowFocusElement">getNextRowFocusElement</a>###
         * @param {JQLite} focusedEl
         * @param {Function=} isAvailable
         * @returns {*}
         */
        function getNextRowFocusElement(focusedEl, isAvailable) {
            result.log("\tFM: getNextRowFocusElement");
            return focusToRowElement(focusedEl, 1, isAvailable);
        }
        /**
         * ###<a name="focusToRowElment">focusToRowElement</a>###
         * Do the heavy lifting for focusing from one row to the next and pulling the selector.
         * Since it is the same going to previous or next it is all one method and just needs to know which direction
         * to increment.
         *
         * options.multipleEnterFocusPerRow is required to focus to multiple input elements per row on enter key.
         *
         * @param {JQLite} focusedEl
         * @param {Number} dir
         * @param {Function=} isAvailable
         */
        function focusToRowElement(focusedEl, dir, isAvailable) {
            // dir should be 1 or -1
            result.log("\tfocusToRowElement");
            focusedEl = wrap(focusedEl);
            if (!inst.element[0].contains(focusedEl[0])) {
                return;
            }
            var resultEl, currentIndex = inst.getRowIndexFromElement(focusedEl), nextIndex = currentIndex + dir, selector, d = inst.getData(), multiIndex = -1, match;
            selector = getSelector(focusedEl, currentIndex);
            result.log("\t" + selector);
            if (inst.options.gridFocusManager && inst.options.gridFocusManager.multipleEnterFocusPerRow) {
                match = selector.match(eqrx);
                selector = selector.split(":").shift();
                multiIndex = match ? parseInt(match[1], 10) : -1;
                if (multiIndex >= -1) {
                    nextIndex -= dir;
                }
            }
            if (nextIndex < 0 || nextIndex >= inst.rowsLength) {
                return focusedEl;
            }
            while (isAvailable && d[nextIndex] && !isAvailable(d[nextIndex])) {
                nextIndex += dir;
            }
            result.log("\tselector: %s", selector);
            resultEl = findNextRowWithSelection(nextIndex, dir, selector, isAvailable, currentIndex, multiIndex);
            return resultEl && resultEl.length ? resultEl : focusedEl;
        }
        /**
         * ###<a name="getSelector">getSelector</a>###
         * @param {HTMLElement} el
         * @param {Number=} currentIndex
         * @returns {*}
         */
        function getSelector(el, currentIndex) {
            el = el[0] || el;
            var len, matches, index, rowEl, options;
            if (el) {
                currentIndex = currentIndex || inst.getRowIndexFromElement(el);
                rowEl = inst.getRowElm(currentIndex);
                options = inst.options.gridFocusManager;
                if (options && options.enter) {
                    matches = rowEl[0].querySelectorAll(options.enter) || [];
                    index = Array.prototype.indexOf.call(matches, el);
                    if (index !== -1) {
                        len = matches && matches.length || 0;
                        return inst.options.gridFocusManager.enter + (len > 1 ? ":eq(" + index + ")" : "");
                    }
                }
                return ux.selector.quickSelector(el, rowEl[0], filterClasses);
            }
            return "";
        }
        /**
         * ###<a name="performFocus">performFocus</a>###
         * Do the actual focus. Select the text if select exists.
         * @param {JQLite} focusEl
         */
        function performFocus(focusEl) {
            result.log("\tperformFocus %o", focusEl[0]);
            var success = false;
            // we now need to scroll the row into view if it is not.
            if (focusEl[0]) {
                inst.scrollModel.scrollIntoView(inst.getRowIndexFromElement(focusEl), true);
                if (focusEl[0].scrollIntoViewIfNeeded) {
                    focusEl[0].scrollIntoViewIfNeeded({
                        behavior: "smooth"
                    });
                }
                if (focusEl[0].select) {
                    focusEl[0].select();
                }
                focusEl[0].focus();
                success = true;
            }
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
         * @param {Function} isAvailable
         * @param {int} currentIndex
         * @param {int} multiIndex
         * @returns {JQLite}
         */
        function findNextRowWithSelection(nextIndex, dir, selector, isAvailable, currentIndex, multiIndex) {
            result.log("\tfindNextRowWithSelection");
            var multi = inst.options.gridFocusManager && inst.options.gridFocusManager.multipleEnterFocusPerRow;
            if (inst.options.gridFocusManager && inst.options.gridFocusManager.filterNextPattern) {
                // make it look just through the objects to jump to that item.
                while (nextIndex > 0 && nextIndex < inst.rowsLength - 1 && !exports.util.isMatch(inst.data[nextIndex], inst.options.gridFocusManager.filterNextPattern)) {
                    nextIndex += dir;
                }
            }
            var nextEl = inst.getRowElm(nextIndex), focusEl, index;
            if (nextEl[0].classList.contains("uncompiled")) {
                // we must remove the hidden value on the uncompiled or it will not pass visibility.
                nextEl[0].classList.remove("uncompiled");
                focusEl = query(nextEl[0], selector);
                nextEl[0].classList.add("uncompiled");
            } else {
                focusEl = query(nextEl[0], selector);
            }
            if (multi && multiIndex !== -1 && focusEl.length > 1 && (dir > 0 && multiIndex < focusEl.length - 1 || dir < 0 && multiIndex > 0)) {
                if (currentIndex === nextIndex) {
                    index = multiIndex + dir;
                }
                if (focusEl[index]) {
                    focusEl = angular.element(focusEl[index]);
                } else {
                    focusEl = null;
                }
            } else if (multi && currentIndex === nextIndex) {
                nextIndex += dir;
                nextEl = inst.getRowElm(nextIndex);
                if (nextEl[0] === inst.getContent()[0]) {
                    return;
                }
                if (nextEl[0].classList.contains("uncompiled")) {
                    // we must remove the hidden value on the uncompiled or it will not pass visibility.
                    nextEl[0].classList.remove("uncompiled");
                    focusEl = query(nextEl[0], selector);
                    nextEl[0].classList.add("uncompiled");
                } else {
                    focusEl = query(nextEl[0], selector);
                }
                if (focusEl.length > 1) {
                    index = offsetIndex(dir, focusEl);
                    if (focusEl[index]) {
                        focusEl = angular.element(focusEl[index]);
                    } else {
                        focusEl = null;
                    }
                }
            }
            var content = inst.getContent(), d = inst.getData();
            while (!focusEl[0] && (dir > 0 && nextIndex < inst.rowsLength - 1 || dir < 0 && nextIndex > 0)) {
                nextIndex += dir;
                if (!isAvailable || isAvailable && isAvailable(d[nextIndex])) {
                    nextEl = inst.getRowElm(nextIndex);
                    if (nextEl[0] === content[0]) {
                        return;
                    }
                    if (nextEl.hasClass("uncompiled")) {
                        inst.forceRenderScope(nextIndex);
                        nextEl = inst.getRowElm(nextIndex);
                    }
                    focusEl = multi ? angular.element(nextEl[0].querySelectorAll(selector)) : query(nextEl[0], selector);
                    //query(nextEl[0], selector);
                    if (multi && focusEl.length > 1) {
                        index = offsetIndex(dir, focusEl);
                        if (focusEl[index]) {
                            focusEl = angular.element(focusEl[index]);
                        } else {
                            focusEl = angular.element(focusEl[0]);
                        }
                    }
                }
            }
            return focusEl;
        }
        function offsetIndex(dir, focusEl) {
            if (dir < 0) {
                return focusEl.length - 1;
            } else if (dir > 0) {
                return 0;
            }
            return;
        }
        function onResize(event) {
            var index;
            if (document.activeElement !== inst.element[0] && inst.element[0].contains(document.activeElement)) {
                index = inst.getRowIndexFromElement(document.activeElement);
                inst.scrollModel.scrollIntoView(index);
            }
        }
        function throttleNextPrev(method) {
            if (inst.options.gridFocusManager && inst.options.gridFocusManager.throttleNextPrev) {
                if (throttleIntv) {
                    return;
                } else {
                    throttleIntv = setTimeout(function() {
                        clearTimeout();
                        throttleIntv = 0;
                    }, inst.options.gridFocusManager.throttleNextPrev);
                }
            }
            inst.creepRenderModel.stop();
            inst.flow.add(method, [ document.activeElement ], 0);
        }
        function focusToPrevElementOfSame(evt, checkFn) {
            if (inst.element[0].contains(document.activeElement)) {
                throttleNextPrev(function(activeElement) {
                    var found = focusToPrevRowElement(activeElement, checkFn);
                    stopWaitingForPrevRetry();
                    if (!found) {
                        result.info("pageUp");
                        inst.scrollModel.pageUp();
                        inst.scope.$emit(exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME_FAILURE);
                        waitingForPrevFocusRetryUnwatch = inst.scope.$on(exports.datagrid.events.ON_AFTER_RENDER, function() {
                            stopWaitingForPrevRetry();
                            focusToPrevElementOfSame(evt, checkFn);
                        });
                    } else {
                        inst.scope.$emit(exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME_FOUND);
                    }
                });
            }
        }
        function focusToNextElementOfSame(evt, checkFn) {
            if (inst.element[0].contains(document.activeElement)) {
                throttleNextPrev(function(activeElement) {
                    var found = focusToNextRowElement(activeElement, checkFn);
                    stopWaitingForNextRetry();
                    if (!found) {
                        result.info("pageDown");
                        inst.scrollModel.pageDown();
                        inst.scope.$emit(exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME_FAILURE);
                        waitingForNextFocusRetryUnwatch = inst.scope.$on(exports.datagrid.events.ON_AFTER_RENDER, function() {
                            stopWaitingForNextRetry();
                            focusToNextElementOfSame(evt, checkFn);
                        });
                    } else {
                        inst.scope.$emit(exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME_FOUND);
                    }
                });
            }
        }
        function stopWaitingForPrevRetry() {
            if (waitingForPrevFocusRetryUnwatch) {
                var fn = waitingForPrevFocusRetryUnwatch;
                waitingForPrevFocusRetryUnwatch = null;
                fn();
            }
        }
        function stopWaitingForNextRetry() {
            if (waitingForNextFocusRetryUnwatch) {
                var fn = waitingForNextFocusRetryUnwatch;
                waitingForNextFocusRetryUnwatch = null;
                fn();
            }
        }
        // it has to match a pattern for each row. These are too unique.
        ux.selector.config.allowId = false;
        ux.selector.config.allowAttributes = false;
        ux.selector.config.addVisible = true;
        result.resetListeners = function(el) {
            removeListenersToRow(el);
            addListenersToRow(el);
        };
        result.hasPrevRowFocusElement = hasPrevRowFocusElement;
        result.hasNextRowFocusElement = hasNextRowFocusElement;
        result.focusToPrevRowElement = focusToPrevRowElement;
        result.focusToNextRowElement = focusToNextRowElement;
        result.query = query;
        result.destroy = function destroy() {
            stopWaitingForPrevRetry();
            stopWaitingForNextRetry();
            while (unwatchers.length) {
                unwatchers.pop()();
            }
            unwatchers = null;
            result = null;
        };
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_RESET, removeListeners));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_RENDER, removeListeners));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_RENDER, addListeners));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME, focusToPrevElementOfSame));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME, focusToNextElementOfSame));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_HEIGHTS_UPDATED_RENDER, onResize));
        inst.gridFocusManager = result;
        return inst;
    } ];
});
}(this.ux = this.ux || {}, function() {return this;}()));
