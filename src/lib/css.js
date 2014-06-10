/**
 * ##ux.CSS##
 * Create custom style sheets. This has a performance increase over modifying the style on multiple dom
 * elements because you can create the sheet or override it and then all with that classname update by the browser
 * instead of the manual insertion into style attributes per dom node.
 */
exports.css = (function CSS() {

    var customStyleSheets = {},
        cache = {},
        cnst = {
            head: "head",
            screen: "screen",
            string: "string",
            object: "object"
        };

    /**
     * **createCustomStyleSheet** given a name creates a new styleSheet.
     * @param {Strng} name
     * @returns {*}
     */
    function createCustomStyleSheet(name) {
        if (!getCustomSheet(name)) {
            customStyleSheets[name] = createStyleSheet(name);
        }
        return getCustomSheet(name);
    }

    /**
     * **getCustomSheet** get one of the custom created sheets.
     * @param name
     * @returns {*}
     */
    function getCustomSheet(name) {
        return customStyleSheets[name];
    }

    /**
     * **createStyleSheet** does the heavy lifting of creating a style sheet.
     * @param {String} name
     * @returns {{name: *, styleSheet: *}}
     */
    function createStyleSheet(name) {
        if (!document.styleSheets) {
            return;
        }

        if (document.getElementsByTagName(cnst.head).length === 0) {
            return;
        }

        var styleSheet, mediaType, i, media;
        if (document.styleSheets.length > 0) {
            for (i = 0; i < document.styleSheets.length; i++) {
                if (document.styleSheets[i].disabled) {
                    continue;
                }
                media = document.styleSheets[i].media;
                mediaType = typeof media;

                if (mediaType === cnst.string) {
                    if (media === "" || (media.indexOf(cnst.screen) !== -1)) {
                        styleSheet = document.styleSheets[i];
                    }
                } else if (mediaType === cnst.object) {
                    if (media.mediaText === "" || (media.mediaText.indexOf(cnst.screen) !== -1)) {
                        styleSheet = document.styleSheets[i];
                    }
                }

                if (typeof styleSheet !== "undefined") {
                    break;
                }
            }
        }

        var styleSheetElement = document.createElement("style");
        styleSheetElement.type = "text/css";
        styleSheetElement.title = name;

        document.getElementsByTagName(cnst.head)[0].appendChild(styleSheetElement);

        for (i = 0; i < document.styleSheets.length; i++) {
            if (document.styleSheets[i].disabled) {
                continue;
            }
            styleSheet = document.styleSheets[i];
        }

        return {
            name: name,
            styleSheet: styleSheet
        };
    }

    /**
     * **createClass** creates a class on a custom style sheet.
     * @param {String} sheetName
     * @param {String} selector - example: ".datagrid"
     * @param {String} style - example: "height:20px;width:40px;color:blue;"
     */
    function createClass(sheetName, selector, style) {
        var sheet = getCustomSheet(sheetName) || createCustomStyleSheet(sheetName), styleSheet = sheet.styleSheet,
            i;
        if (styleSheet.addRule) {
            for (i = 0; i < styleSheet.rules.length; i++) {
                if (styleSheet.rules[i].selectorText && styleSheet.rules[i].selectorText.toLowerCase() === selector.toLowerCase()) {
                    styleSheet.rules[i].style.cssText = style;
                    return;
                }
            }

            styleSheet.addRule(selector, style);
            if (styleSheet.rules[styleSheet.rules.length - 1].cssText === selector + ' { }') {
                throw new Error("CSS failed to write");
            }
        } else if (styleSheet.insertRule) {
            for (i = 0; i < styleSheet.cssRules.length; i++) {
                if (styleSheet.cssRules[i].selectorText && styleSheet.cssRules[i].selectorText.toLowerCase() === selector.toLowerCase()) {
                    styleSheet.cssRules[i].style.cssText = style;
                    return;
                }
            }

            styleSheet.insertRule(selector + "{" + style + "}", 0);
        }
    }

    /**
     * **getSelector** given a selector this will find that selector in the stylesheets. Not just the custom ones.
     * @param {String} selector
     * @returns {*}
     */
    function getSelector(selector) {
        var i, ilen, sheet, classes, result;

        if (selector.indexOf("{") !== -1 || selector.indexOf("}") !== -1) {
            return null;
        }

        if (cache[selector]) {
            return cache[selector]; // return from cache.
        }
        for (i = 0, ilen = document.styleSheets.length; i < ilen; i += 1) {
            sheet = document.styleSheets[i];
            classes = sheet.rules || sheet.cssRules;
            result = getRules(classes, selector);
            if (result) {
                return result;
            }
        }
        return null;
    }

    /**
     * **getRules** given a set of classes and a selector it will get the rules for a style sheet.
     * @param {CSSRules} classes
     * @param {String} selector
     * @returns {*}
     */
    function getRules(classes, selector) {
        var j, jlen, cls, result;
        if (classes) {
            for (j = 0, jlen = classes.length; j < jlen; j += 1) {
                cls = classes[j];
                if (cls.cssRules) {
                    result = getRules(cls.cssRules, selector);
                    if (result) {
                        return result;
                    }
                }


                if (cls.selectorText) {
                    var expression = "(\b)*" + selector.replace('.', '\\.') + "([^-a-zA-Z0-9]|,|$)",
                        matches = cls.selectorText.match(expression);

                    if (matches && matches.indexOf(selector) !== -1) {
                        cache[selector] = cls.style;// cache the value
                        return cls.style;
                    }
                    //TODO: this may need to be more accurate later. For now it just checks for if they have that class.
                }
            }
        }
        return null;
    }

    /**
     * **getCSSValue** return the css value of a property given the selector and the property.
     * @param {String} selector
     * @param {String} property
     * @returns {*}
     */
    function getCSSValue(selector, property) {
        var cls = getSelector(selector);
        return cls && cls[property] !== undefined ? cls[property] : null;// hasOwnProperty in FF and IE not working on CSSStyleDeclaration.
    }

    /**
     * **setCSSValue** overwrite a css value given a selector, property, and new value.
     * @param {String} selector
     * @param {String} property
     * @param {String} value
     */
    function setCSSValue(selector, property, value) {
        var cls = getSelector(selector);
        cls[property] = value;
    }

    /**
     * **ux.CSS API**
     */
    return {
        createdStyleSheets: [],
        createStyleSheet: createStyleSheet,
        createClass: createClass,
        getCSSValue: getCSSValue,
        setCSSValue: setCSSValue,
        getSelector: getSelector
    };
}());