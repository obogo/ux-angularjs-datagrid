/*global exports */
exports.selector = (function () {
//TODO: Needs unit tests. This needs jquery to run unit tests for selections since it uses filters.

    var omitAttrs, uniqueAttrs, classFilters, classFiltersFctn, api, ngRx = /^ng-\w+/;

    function query(selectorStr, el) {
        el = el || api.config.doc.body;
        var rx = /:eq\((\d+)\)$/, match = selectorStr.match(rx), result, count;
        // filter out eq.
        if (match && match.length) {
            selectorStr = selectorStr.replace(rx, '');
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
            var ignore = buildIgnoreFunction(ignoreClass), matches, index, str,
                maxParent = api.config.doc.body,
                selector = getSelectorData(el, maxParent, ignore, null, true);
            while (selector.count > selector.totalCount) {
                selector = selector.parent;
            }
            selector = selector.parent || selector;// once we find the top level. we need to move up one.
            str = selector.str || selectorToString(selector);
            if (selector.str) {
                var child = selector.child;
                while (child) {
                    str += ' ' + child.str;
                    child = child.child;
                }
            }
            if (selector.count > 1 || (selector.child && selector.child.count)) {
                    matches = exports.util.array.toArray(query(str, maxParent));
                index = matches.indexOf(el);
                str += ':eq(' + index + ')';
            }
            str += getVisible();
            return str;
        }
        return '';
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
            var ignore = buildIgnoreFunction(ignoreClass),
                selector = getSelectorData(element, maxParent, ignore);
            return selectorToString(selector) + getVisible();
        }
        return '';
    }

    function validateEl(el) {
        if (!el) {
            return '';
        }
        // we do not want jquery elements here. only HTMLElements
        if (el && el.length && el.nodeType === undefined) {
            exports.datagrid.throwError("selector can only build a selection to a single DOMElement. A list was passed.");
        }
        return true;
    }

    function getVisible() {
        return api.config.addVisible ? ':visible' : '';
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
            type: element.nodeName && element.nodeName.toLowerCase() || '',
            child: child
        };
        if(!result.attributes.$unique || child) {
            if (smartSelector) {
                result.str = selectorToString(result, 0, null, true);
                result.count = maxParent.querySelectorAll(result.str).length;
                if (result.count > 1) {
                    result.parent = getParentSelector(element, maxParent, ignoreClass, result, smartSelector);
                }
            } else { // dumb selector. keeps building it. Not checking to see if it is unique.
                result.parent = getParentSelector(element, maxParent, ignoreClass, result, smartSelector);
            }
        }
        return result;
    }

    function filterNumbers(item) {
        return typeof item !== 'number';
    }

    function buildIgnoreFunction(ignoreClasses) {
        ignoreClasses = ignoreClasses || [];
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
        if (name.indexOf('-')) {
            ary = name.split('-');
            len = ary.length;
            while (i < len) {
                ary[i] = ary[i].charAt(0).toUpperCase() + ary[i].substr(1);
                i += 1;
            }
            name = ary.join('');
        }
        return name;
    }

    function escapeQuotes(str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }

    function selectorToString(selector, depth, overrideMaxParent, skipCount) {
        var matches, str, parent;
        depth = depth || 0;
        str = selector && !selector.attributes.$unique ? selectorToString(selector.parent, depth + 1) : '';
        if (selector) {
            str += (str.length ? ' ' : '') + getSelectorString(selector);
        }
        if (!depth && !skipCount) {
            parent = overrideMaxParent || selector.maxParent;
            matches = parent.querySelectorAll && parent.querySelectorAll(str) || [];
            if (matches.length > 1) {
                str += ':eq(' + getIndexOfTarget(matches, selector.element) + ')';
            }
        }
        return str;
    }

    function getSelectorString(selector) {
        if (selector.attributes.$unique) {
            return selector.attributes[0];
        }
        return selector.type + selector.attributes.join('') + (selector.classes.length ? '.' + selector.classes.join('.') : '');
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

    function getList(obj) {
        var ary = [], i;
        for (i in obj) {
            if (exports.util.apply(Object.prototype.hasOwnProperty, obj, [i])) {
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
        addOmitAttrs: function (name) {
            exports.each(arguments, function (name) {
                omitAttrs[name] = true;
            });
            return this;
        },
        removeOmitAttrs: function (name) {
            exports.each(arguments, function (name) {
                delete omitAttrs[name];
            });
            return this;
        },
        getOmitAttrs: function () {
            return getList(omitAttrs);
        },
        resetOmitAttrs: function () {
            omitAttrs = {'class': true, style: true};
        },
        // UNIQUE
        addUniqueAttrs: function (name) {
            exports.each(arguments, function (name) {
                uniqueAttrs[name] = true;
            });
            return this;
        },
        removeUniqueAttrs: function (name) {
            exports.each(arguments, function (name) {
                delete uniqueAttrs[name];
            });
            return this;
        },
        getUniqueAttrs: function () {
            return getList(uniqueAttrs);
        },
        resetUniqueAttrs: function () {
            uniqueAttrs = {id: true, uid: true};
        },
        // CLASS OMIT OMIT FILTERS
        addClassOmitFilters: function () {
            exports.each(arguments, function (filter) {
                classFilters.push(filter);
            });
            classFiltersFctn = buildIgnoreFunction(classFilters);
            return this;
        },
        removeClassOmitFilters: function () {
            exports.each(arguments, function (filter) {
                var index = classFilters.indexOf(filter);
                if (index !== -1) {
                    classFilters.splice(index, 1);
                }
            });
            classFiltersFctn = buildIgnoreFunction(classFilters);
            return this;
        },
        getClassOmitFilters: function () {
            return classFilters.slice(0);
        },
        resetClassOmitFilters: function () {
            classFilters = [];
            classFiltersFctn = buildIgnoreFunction(classFilters);
        },
        get: getCleanSelector,
        getCleanSelector: getCleanSelector,
        quickSelector: quickSelector,
        reset: function () {
            api.resetOmitAttrs();
            api.resetUniqueAttrs();
            api.resetClassOmitFilters();
        }
    };
    api.reset();
    return api;
}());