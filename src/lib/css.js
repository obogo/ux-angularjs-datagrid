exports.css = (function CSS() {

    var customStyleSheets = {},
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

    return {
        createdStyleSheets: [],
        createStyleSheet: createStyleSheet,
        createClass: createClass
    };
}());