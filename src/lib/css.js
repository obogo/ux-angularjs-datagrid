exports.css = (function CSS() {

    var customStyleSheets = {},
        cache = {},
        cnst = {
            head: "head",
            screen: "screen",
            string: "string",
            object: "object"
        };

    function createCustomStyleSheet(name) {
        if (!getCustomSheet(name)) {
            customStyleSheets[name] = createStyleSheet(name);
        }
        return getCustomSheet(name);
    }

    function getCustomSheet(name) {
        return customStyleSheets[name];
    }

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

    function getCSSValue(selector, property) {
        var cls = getSelector(selector);
        return cls && cls[property] !== undefined ? cls[property] : null;// hasOwnProperty in FF and IE not working on CSSStyleDeclaration.
    }

    function setCSSValue(selector, property, value) {
        var cls = getSelector(selector);
//        cls.cssText = property + ":" + value + ";";
        cls[property] = value;
    }

    return {
        createdStyleSheets: [],
        createStyleSheet: createStyleSheet,
        createClass: createClass,
        getCSSValue: getCSSValue,
        setCSSValue: setCSSValue
    };
}());