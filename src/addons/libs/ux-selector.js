    /*global exports */
exports.selector = (function () {
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
        return selectorToString(selector) + ':visible';
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
        str = selector ? selectorToString(selector.parent, depth + 1) : '';
        if (selector) {
            str += (str.length ? ' ' : '') + selector.type + (selector.classes.length ? '.' + selector.classes.join('.') : '');
        }
        if (!depth) {
            matches = selector.maxParent.querySelectorAll(str);
            if (matches.length > 1) {
                str += ':eq(' + getIndexOfTarget(matches, selector.element) + ')';
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
        getSelector: getSelector
    };
}());