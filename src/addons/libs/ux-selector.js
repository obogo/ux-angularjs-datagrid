/*global exports */
exports.selector = (function () {
//TODO: Needs unit tests. This needs jquery to run unit tests for selections since it uses filters.
    /**
     * ##getCleanSelector##
     * Generate a clean readable selector. This is accurate, but NOT performant.
     * @param {DOMElement} el
     * @param {Array} ignoreClasses - an array of strings or regExp
     */
    function getCleanSelector(el, ignoreClass) {
        var ignore = buildIgnoreFunction(ignoreClass), matches, index, str,
            selector = getSelectorData(el, document.body, ignore, null, true);
        while (selector.count > selector.totalCount) {
            selector = selector.parent;
        }
        selector = selector.parent || selector;// once we find the top level. we need to move up one.
        str = selector.relativeSelector;
        if (selector.count > 1) {
            matches = exports.util.array.toArray(selector.maxParent.querySelectorAll(selector.relativeSelector));
            index = matches.indexOf(el);
            str += ':eq(' + index + ')';
        }
        str += ':visible';
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
        var ignore = buildIgnoreFunction(ignoreClass),
            selector = getSelectorData(element, maxParent, ignore);
        return selectorToString(selector) + ':visible';
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
            type: element.nodeName && element.nodeName.toLowerCase() || '',
            child: child
        };
        if (detailed && element.nodeType >= 1) {
            result.relativeSelector = getSelectorString(result) + (result.child ? ' ' + result.child.relativeSelector : '');//selectorToString(result, 0, result.parent);
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
        return typeof item !== 'number';
    }

    function buildIgnoreFunction(ignoreClasses) {
        if (typeof ignoreClasses === "function") {
            return ignoreClasses;
        }
        return function (cls) {
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
        str = selector ? selectorToString(selector.parent, depth + 1) : '';
        if (selector) {
            str += (str.length ? ' ' : '') + getSelectorString(selector);
        }
        if (!depth) {
            parent = overrideMaxParent || selector.maxParent;
            matches = parent.querySelectorAll && parent.querySelectorAll(str) || [];
            if (matches.length > 1) {
                str += ':eq(' + getIndexOfTarget(matches, selector.element) + ')';
            }
        }
        return str;
    }

    function getSelectorString(selector) {
        return selector.type + (selector.classes.length ? '.' + selector.classes.join('.') : '');
    }

    function getParentSelector(element, maxParent, ignoreClass, child, detailed) {
        var parent = element.parentNode;
        if (parent && parent !== maxParent) {
            return getSelectorData(element.parentNode, maxParent, ignoreClass, child, detailed);
        }
        return null;
    }

    function getIndexOfTarget(list, element) {
        var i,
            iLen = list.length;
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
}());