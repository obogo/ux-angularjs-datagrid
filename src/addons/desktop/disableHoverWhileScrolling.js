/**
 * Based on the article here for a performance increase or prevention of performance degradation
 * when hover elements are added to a grid. If your grid has lots of hover events this will keep
 * them from reducing your fps.
 * http://www.thecssninja.com/javascript/pointer-events-60fps
 */
ux.css = (function CSS() {

    var customStyleSheets = {};

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

        if (document.getElementsByTagName("head").length === 0) {
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

                if (mediaType === "string") {
                    if (media === "" || (media.indexOf("screen") !== -1)) {
                        styleSheet = document.styleSheets[i];
                    }
                } else if (mediaType === "object") {
                    if (media.mediaText === "" || (media.mediaText.indexOf("screen") !== -1)) {
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

        document.getElementsByTagName("head")[0].appendChild(styleSheetElement);

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

angular.module('ux').factory('disableHoverWhileScrolling', function () {
    return function (exp) {
        var name = "disable-hover-while-scrolling",
            timer;

        function init() {
            exp.flow.log("init");
            ux.css.createClass('grid', '.' + name + ' *', "pointer-events: none !important;");
        }

        function scrollStart() {
            clearTimeout(timer);
            exp.flow.log("scrollStart");
            if (!exp.element[0].classList.contains(name)) {
                exp.element[0].classList.add(name);
            }
        }

        function scrollStop() {
            timer = setTimeout(function () {
                exp.flow.log("scrollStop");
                exp.element[0].classList.remove(name);
            }, 500);
        }

        exp.unwatchers.push(exp.scope.$on(ux.datagrid.events.SCROLL_START, scrollStart));
        exp.unwatchers.push(exp.scope.$on(ux.datagrid.events.SCROLL_STOP, scrollStop));

        init();

        return exp;
    };
});