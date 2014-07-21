/*
* uxDatagrid v.1.1.0
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
exports.errors = {
    E1000: "Datagrid cannot have a height of 0",
    E1001: "RENDER STATE INVALID. The only valid render states are those on ux.datagrid.states",
    E1002: "Unable to render. Invalid activeRange.",
    E1101: "Script templates that are used for datagrid rows must have a height greater than 0. This may be because the grid is not yet attached to the dom preventing it from calculating heights.",
    E1102: "at least one template is required. There were no row templates found for the datagrid."
};

/**
 * ## Configs ##
 * ux.datagrid is a highly performant scrolling list for desktop and mobile devices that leverages
 * the browsers ability to gpu cache the dom structure with fast startup times and optimized rendering
 * that allows the gpu to maintain its snapshots as long as possible.
 *
 * Create the default module of ux if it doesn't already exist.
 */
var module, isIOS = !!navigator.userAgent.match(/(iPad|iPhone|iPod)/g);

try {
    module = angular.module("ux", [ "ng" ]);
} catch (e) {
    module = angular.module("ux");
}

/**
 * Create the datagrid namespace.
 * add the default options for the datagrid. These can be overridden by passing your own options to each
 * instance of the grid. In your HTML templates you can provide the object that will override these settings
 * on a per grid basis.
 *
 *      <div ux-datagrid="mylist"
 *          options="{debug:{all:1, Flow:0}}">...</div>
 *
 * These options are then available to other addons to configure them.
 */
exports.datagrid = {
    /**
     * ###<a name="version">version</a>###
     * Current datagrid version.
     */
    version: "1.1.0",
    /**
     * ###<a name="isIOS">isIOS</a>###
     * iOS does not natively support smooth scrolling without a css attribute. `-webkit-overflow-scrolling: touch`
     * however with this attribute iOS would crash if you try to change the scroll with javascript, or turn it on and off.
     * So a [virtualScroll](#virtualScroll) was implemented for iOS to make it scroll using translate3d.
     */
    isIOS: isIOS,
    /**
     * ###<a name="states">states</a>###
     *  - **<a name="states.BUILDING">BUILDING</a>**: is the startup phase of the grid before it is ready to perform the first render. This may include
     * waiting for the dom heights be available.
     *  - **<a name="states.ON_READY">ON_READY</a>**: this means that the grid is ready for rendering.
     */
    states: {
        BUILDING: "datagrid:building",
        READY: "datagrid:ready"
    },
    /**
     * ###<a name="events">events</a>###
     * The events are in three categories based on if they notify of something that happened in the grid then they
     * start with an ON_ or if they are driving the behavior of the datagrid, or they are logging events.
     * #### Notifying Events ####
     * - **<a name="events.ON_INIT">ON_INIT</a>** when the datagrid has added the addons and is now starting.
     * - **<a name="events.ON_LISTENERS_READY">ON_LISTENERS_READY</a>** Datagrid is now listening. Feel free to fire your events that direct it's behavior.
     * - **<a name="events.ON_READY">ON_READY</a>** the datagrid is all setup with templates, viewHeight, and data and is ready to render.
     * - **<a name="events.ON_STARTUP_COMPLETE">ON_STARTUP_COMPLETE</a>** when the datagrid has finished its first render.
     * - **<a name="events.ON_BEFORE_RENDER">ON_BEFORE_RENDER</a>** the datagrid is just about to add needed chunks, perform compiling of uncompiled rows, and update and digest the active scopes.
     * - **<a name="events.ON_AFTER_RENDER">ON_AFTER_RENDER</a>** chunked dome was added if needed, active rows are compiled, and active scopes are digested.
     * - **<a name="events.ON_BEFORE_UPDATE_WATCHERS">ON_BEFORE_UPDATE_WATCHERS</a>** Before the active set of watchers is changed.
     * - **<a name="events.ON_AFTER_UPDATE_WATCHERS">ON_AFTER_UPDATE_WATCHERS</a>** After the active set of watchers is changed and digested and activeRange is updated.
     * - **<a name="events.ON_BEFORE_DATA_CHANGE">ON_BEFORE_DATA_CHANGE</a>** A data change watcher has fired. The change has not happened yet.
     * - **<a name="events.ON_BEFORE_RENDER_AFTER_DATA_CHANGE">ON_BEFORE_RENDER_AFTER_DATA_CHANGE</a>** When ever a data change is fired. Just before the render happens.
     * - **<a name="events.ON_RENDER_AFTER_DATA_CHANGE">ON_RENDER_AFTER_DATA_CHANGE</a>** When a render finishes and a data change was what caused it.
     * - **<a name="events.ON_ROW_TEMPLATE_CHANGE">ON_ROW_TEMPLATE_CHANGE</a>** When we change the template that is matched with the row.
     * - **<a name="events.ON_SCROLL">ON_SCROLL</a>** When a scroll change is captured by the datagrid.
     * - **<a name="events.ON_BEFORE_RESET">ON_BEFORE_RESET</a>** Before the dom is reset this event is fired. Every addon should listen to this event and clean up any listeners
     * that are necessary when this happens so the dom can be cleaned up for the reset.
     * - **<a name="events.ON_AFTER_RESET">ON_AFTER_RESET</a>** After the reset the listeners from the addon can be put back on allowing the reset data to have been completely cleared.
     */
    events: {
        ON_INIT: "datagrid:onInit",
        ON_LISTENERS_READY: "datagrid:onListenersReady",
        ON_READY: "datagrid:onReady",
        ON_STARTUP_COMPLETE: "datagrid:onStartupComplete",
        ON_BEFORE_RENDER: "datagrid:onBeforeRender",
        ON_AFTER_RENDER: "datagrid:onAfterRender",
        ON_BEFORE_UPDATE_WATCHERS: "datagrid:onBeforeUpdateWatchers",
        ON_AFTER_UPDATE_WATCHERS: "datagrid:onAfterUpdateWatchers",
        ON_BEFORE_DATA_CHANGE: "datagrid:onBeforeDataChange",
        ON_AFTER_DATA_CHANGE: "datagrid:onAfterDataChange",
        ON_BEFORE_RENDER_AFTER_DATA_CHANGE: "datagrid:onBeforeRenderAfterDataChange",
        ON_RENDER_AFTER_DATA_CHANGE: "datagrid:onRenderAfterDataChange",
        ON_ROW_TEMPLATE_CHANGE: "datagrid:onRowTemplateChange",
        ON_SCROLL: "datagrid:onScroll",
        ON_BEFORE_RESET: "datagrid:onBeforeReset",
        ON_AFTER_RESET: "datagrid:onAfterReset",
        ON_AFTER_HEIGHTS_UPDATED: "datagrid:onAfterHeightsUpdated",
        ON_AFTER_HEIGHTS_UPDATED_RENDER: "datagrid:onAfterHeightsUpdatedRender",
        ON_BEFORE_ROW_DEACTIVATE: "datagrid:onBeforeRowDeactivate",
        // handy for knowing when to remove jquery listeners.
        ON_AFTER_ROW_ACTIVATE: "datagrid:onAFterRowActivate",
        // handy for turning jquery listeners back on.
        ON_ROW_COMPILE: "datagrid:onRowCompile",
        ON_SCROLL_TO_TOP: "datagrid:onScrollToTop",
        ON_SCROLL_TO_BOTTOM: "datagrid:onScrollToBottom",
        /**
         * #### Driving Events ####
         * - **<a name="events.RESIZE">RESIZE</a>** tells the datagrid to resize. This will update all height calculations.
         * - **<a name="events.UPDATE">UPDATE</a>** force the datagrid to re-evaluate the data and render.
         * - **<a name="events.SCROLL_TO_INDEX">SCROLL_TO_INDEX</a>** scroll the item at that index to the top.
         * - **<a name="events.SCROLL_TO_ITEM">SCROLL_TO_ITEM</a>** scroll that item to the top.
         * - **<a name="events.SCROLL_INTO_VIEW">SCROLL_INTO_VIEW</a>** if the item is above the scroll area, scroll it to the top. If is is below scroll it to the bottom. If it is in the middle, do nothing.
         */
        RESIZE: "datagrid:resize",
        UPDATE: "datagrid:update",
        SCROLL_TO_INDEX: "datagrid:scrollToIndex",
        SCROLL_TO_ITEM: "datagrid:scrollToItem",
        SCROLL_INTO_VIEW: "datagrid:scrollIntoView",
        /**
         * #### Log Events ####
         * - **<a name="events.LOG">LOG</a>** An event to be picked up if the gridLogger is added to the addons or any other listener for logging.
         * - **<a name="events.INFO">INFO</a>** An event to be picked up if the gridLogger is added to the addons or any other listener for logging.
         * - **<a name="events.WARN">WARN</a>** An event to be picked up if the gridLogger is added to the addons or any other listener for logging.
         * - **<a name="events.ERROR">ERROR</a>** An event to be picked up if the gridLogger is added to the addons or any other listener for logging.
         */
        LOG: "datagrid:log",
        INFO: "datagrid:info",
        WARN: "datagrid:warn",
        ERROR: "datagrid:error"
    },
    /**
     * ###<a name="options">options</a>###
     */
    options: {
        // - **<a name="options.asyc">async</a>** this changes the flow manager into not allowing async actions to allow unti tests to perform synchronously.
        async: true,
        // - **<a name="options.updateDelay">updateDelay</a>** used by the scrollModel so that it gives cushion after the grid has stopped scrolling before rendering.
        // while faster times on this make it render faster, it can cause it to rencer multiple times because the scrollbar is not completely stopped and may decrease
        // scrolling performance. if < 100ms this fires too often.
        updateDelay: 100,
        // - **<a name="options.creepRender.enable">creepRender.enable</a>** allow the rendering after the scrolling has stopped to creep in both directions away from the
        // visible area. This can affect performance in a couple of ways. It will make it so more rows are rendered so scrolling will not have to wait for them, however if
        // the device is slower this may affect performance in scrolling because the render has to finish before the touch events will work causing a delay in reaction to
        // touch events.
        creepRender: {
            enable: true
        },
        // - **<a name="creepStartDelay">creepStartDelay</a>**
        // when the creep render starts. How long after the scrolling has stopped.
        creepStartDelay: 1e3,
        // - **<a name="options.cushion">cushion</a>** this it used by the updateRowWatchers and what rows it will update. It can be handy for debugging to make sure only
        // the correct rows are digesting by making the value positive it will take off space from the top and bottom of the viewport that number of pixels to match what
        // rows are activated and which ones are not. Also a negative number will cause the grid to render past the viewable area and digest rows that are out of view.
        // In short it is a debugging cushion about what is activated to see them working.
        cushion: -100,
        chunks: {
            // - **<a name="options.chunks.detachDom">chunks.detachDom</a>** this is used when you want the chunks to be absolute positioned and
            // chunks that are out of view are hidden to minimize the gpu snapshot. Values are numbers or boolean.
            // 100 will 100 rows above and below the viewport area. A true will evaluate to 0 above and below. A 0 will equate to false and not do a detach.
            // So the value must be true or a whole number to enable it.
            detachDom: null,
            // - **<a name="options.chunks.size">chunks.size</a>** this is used to determine how large each chunk should be. Chunks are made recursively
            // so if you pass 8 items and they are chunked at 2 then you would have 2 chunks each with 2 chunks each with 2 rows.
            size: 50,
            // - **<a name="options.chunks.chunkClass">chunks.chunkClass</a>** the class assigned to each chunk in the datagrid. This can be customized on a per grid basis since options
            // can be overridden so that styles or selection may differ from one grid to the next.
            chunkClass: "datagrid-chunk",
            // - **<a name="options.chunks.chunkDisabledClass">chunkDisabledClass</a>**
            // a css class that is added to dom elements that are not containing visible rows.
            chunkDisabledClass: "datagrid-chunk-disabled",
            // - **<a name="options.chunks.chunkReadyClass">chunks.chunkReadyClass</a>** after the chunk is added. The chunk ready class is added to all for css
            // transitions on newly created chunks.
            chunkReadyClass: "datagrid-chunk-ready"
        },
        scrollModel: {
            // - **<a name="options.scrollModel.speed">scrollModel.speed</a>** the factor of speed multiplication when determining how far the scroller should coast in manual mode.
            speed: 5,
            // - **<a name="options.scrollModel.manual">scrollModel.manual</a>** if set to true then touch move events will be used to scroll and calculate coasting.
            manual: true,
            // - **<a name="options.scrollModel.simulateClick">scrollModel.simulateClick</a>** defaulted to true for android, and false for iOS.
            simulateClick: !isIOS
        },
        // - **<a name="options.compiledClass">compiledClass</a>** after a row has been compiled the uncompiled class is removed and compiled is added.
        compiledClass: "compiled",
        // - **<a name="options.uncompiledClass">uncompiledClass</a>** before a dom row is rendered it is compiled. The compiled row will have {{}} still in the code
        // because the row has not been digested yet. If the user scrolls they can see this. So the uncompiledClass is used to allow the css to hide rows that are not
        // yet compiled. Once they are compiled and digested the uncompiledClass will be removed from that dom row.
        uncompiledClass: "uncompiled",
        // - **<a name="contentClass">contentClass</a>** the name of the css class assigned to the content div.
        contentClass: "datagrid-content",
        // - **<a name="rowClass">rowClass</a>** the css class assigned to every row.
        rowClass: "datagrid-row",
        // - **<a name="options.renderThreshold">renderThreshold</a>** this value is used by the creepRenderModel to allow the render to process for this amount of ms in
        // both directions from the current visible area and then it will wait and process again as many rows as it can in this timeframe.
        renderThreshold: 1,
        // - **<a name="options.renderThresholdWait">renderThresholdWait</a>** used in conjunction with options.renderThreshold this will wait this amount of time before
        // trying to render more rows.
        renderThresholdWait: 50,
        // - **<a name="options.renderWhileScrolling">renderWhileScrolling</a>** cause the grid to render while scrolling. This can will drastically reduce scrolling performance.
        // this can be optimized by setting a number of milliseconds between each render while scrolling.
        renderWhileScrolling: false,
        // - **<a name="options.creepLimit">creepLimit</a>** used with options.renderThreshold and options.renderThresholdWait this will give a maximum amount of renders
        // that can be done before the creep render is turned off.
        creepLimit: 500,
        // - **<a name="options.smartUpdate">smartUpdate</a>** when this is enabled if the array changes the order of things but not the templates that they render in then
        // this will not do a normal reset, but will just re-render the visible area with the changes and as you scroll the changes will update.
        smartUpdate: true
    },
    /**
     * ###<a name="coreAddons">coreAddons</a>###
     * the core addons are the ones that are built into the angular-ux-datagrid. This array is used when the grid starts up
     * to add all of these addons before optional addons are added. You can add core addons to the datagrid by adding these directly to this array, however it is not
     * recommended.
     */
    coreAddons: []
};

/**
 * ###addons###
 * The addons module is used to pass injected names directly to the directive and then have them applied
 * to the instance. Each of the addons is expected to be a factory that takes at least one argument which
 * is the instance being passed to it. They can ask for additional ones as well and they will be injected
 * in from angular's injector.
 */
module.factory("gridAddons", [ "$injector", function($injector) {
    function applyAddons(addons, instance) {
        var i = 0, len = addons.length, result, addon;
        while (i < len) {
            result = $injector.get(addons[i]);
            if (typeof result === "function" || result instanceof Array) {
                // It is expected that each addon be a function or injector array syntax. inst is the instance that is injected.
                addon = $injector.invoke(result, instance, {
                    inst: instance
                });
            } else {
                // they must have returned a null? what was the point. Throw an error.
                throw new Error("Addons expect a function ($injector array supported) to pass the grid instance to.");
            }
            i += 1;
        }
    }
    return function(instance, addons) {
        // addons can be a single item, array, or comma/space separated string.
        addons = addons instanceof Array ? addons : addons && addons.replace(/,/g, " ").replace(/\s+/g, " ").split(" ") || [];
        if (instance.addons) {
            addons = instance.addons = instance.addons.concat(addons);
        }
        applyAddons(addons, instance);
    };
} ]);

/**
 * **charPack** given a character it will repeat it until the amount specified.
 * example: charPack('0', 3) => '000'
 * @param {String} char
 * @param {Number} amount
 * @returns {string}
 */
function charPack(char, amount) {
    var str = "";
    while (str.length < amount) {
        str += char;
    }
    return str;
}

/**
 * ##ux.CSS##
 * Create custom style sheets. This has a performance increase over modifying the style on multiple dom
 * elements because you can create the sheet or override it and then all with that classname update by the browser
 * instead of the manual insertion into style attributes per dom node.
 */
exports.css = function CSS() {
    var customStyleSheets = {}, cache = {}, cnst = {
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
                    if (media === "" || media.indexOf(cnst.screen) !== -1) {
                        styleSheet = document.styleSheets[i];
                    }
                } else if (mediaType === cnst.object) {
                    if (media.mediaText === "" || media.mediaText.indexOf(cnst.screen) !== -1) {
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
        var sheet = getCustomSheet(sheetName) || createCustomStyleSheet(sheetName), styleSheet = sheet.styleSheet, i;
        if (styleSheet.addRule) {
            for (i = 0; i < styleSheet.rules.length; i++) {
                if (styleSheet.rules[i].selectorText && styleSheet.rules[i].selectorText.toLowerCase() === selector.toLowerCase()) {
                    styleSheet.rules[i].style.cssText = style;
                    return;
                }
            }
            styleSheet.addRule(selector, style);
            if (styleSheet.rules[styleSheet.rules.length - 1].cssText === selector + " { }") {
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
            return cache[selector];
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
                    var expression = "(\b)*" + selector.replace(".", "\\.") + "([^-a-zA-Z0-9]|,|$)", matches = cls.selectorText.match(expression);
                    if (matches && matches.indexOf(selector) !== -1) {
                        cache[selector] = cls.style;
                        // cache the value
                        return cls.style;
                    }
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
        return cls && cls[property] !== undefined ? cls[property] : null;
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
}();

/**
 * ##ux.each##
 * Like angular.forEach except that you can pass additional arguments to it that will be available
 * in the iteration function. It is optimized to use while loops where possible instead of for loops for speed.
 * Like Lo-Dash.
 * @param {Array\Object} list
 * @param {Function} method
 * @param {*=} data _additional arguments passes are available in the iteration function_
 * @returns {*}
 */
//_example:_
//
//      function myMethod(item, index, list, arg1, arg2, arg3) {
//          console.log(arg1, arg2, arg3);
//      }
//      ux.each(myList, myMethod, arg1, arg2, arg3);
function each(list, method, data) {
    var i = 0, len, result, extraArgs;
    if (arguments.length > 2) {
        extraArgs = exports.util.array.toArray(arguments);
        extraArgs.splice(0, 2);
    }
    if (list && list.length) {
        len = list.length;
        while (i < len) {
            result = method.apply(null, [ list[i], i, list ].concat(extraArgs));
            if (result !== undefined) {
                return result;
            }
            i += 1;
        }
    } else if (list && Object.prototype.hasOwnProperty.apply(list, [ "0" ])) {
        while (Object.prototype.hasOwnProperty.apply(list, [ i ])) {
            result = method.apply(null, [ list[i], i, list ].concat(extraArgs));
            if (result !== undefined) {
                return result;
            }
            i += 1;
        }
    } else if (!(list instanceof Array)) {
        for (i in list) {
            if (Object.prototype.hasOwnProperty.apply(list, [ i ])) {
                result = method.apply(null, [ list[i], i, list ].concat(extraArgs));
                if (result !== undefined) {
                    return result;
                }
            }
        }
    }
    return list;
}

exports.each = each;

/**
 * **filter** built on the same concepts as each. So that you can pass additional arguments.
 * @param list
 * @param method
 * @param data
 * @returns {Array}
 */
function filter(list, method, data) {
    var i = 0, len, result = [], extraArgs, response;
    if (arguments.length > 2) {
        extraArgs = exports.util.array.toArray(arguments);
        extraArgs.splice(0, 2);
    }
    if (list && list.length) {
        len = list.length;
        while (i < len) {
            response = method.apply(null, [ list[i], i, list ].concat(extraArgs));
            if (response) {
                result.push(list[i]);
            }
            i += 1;
        }
    } else {
        for (i in list) {
            if (Object.prototype.hasOwnProperty.apply(list, [ i ])) {
                response = method.apply(null, [ list[i], i, list ].concat(extraArgs));
                if (response) {
                    result.push(list[i]);
                }
            }
        }
    }
    return result;
}

exports.filter = filter;

/**
 * ##dispatcher##
 * Behavior modifier for event dispatching.
 * @param {Object} target - the object to apply the methods to.
 * @param {Object} scope - the object that the methods will be applied from
 * @param {object} map - custom names of what methods to map from scope. such as _$emit_ and _$broadcast_.
 */
function dispatcher(target, scope, map) {
    var listeners = {};
    /**
     * ###off###
     * removeEventListener from this object instance. given the event listened for and the callback reference.
     * @param event
     * @param callback
     */
    function off(event, callback) {
        var index, list;
        list = listeners[event];
        if (list) {
            if (callback) {
                index = list.indexOf(callback);
                if (index !== -1) {
                    list.splice(index, 1);
                }
            } else {
                list.length = 0;
            }
        }
    }
    /**
     * ###on###
     * addEventListener to this object instance.
     * @param {String} event
     * @param {Function} callback
     * @returns {Function} - removeListener or unwatch function.
     */
    function on(event, callback) {
        listeners[event] = listeners[event] || [];
        listeners[event].push(callback);
        return function() {
            off(event, callback);
        };
    }
    /**
     * ###onOnce###
     * addEventListener that gets remove with the first call.
     * @param event
     * @param callback
     * @returns {Function} - removeListener or unwatch function.
     */
    function onOnce(event, callback) {
        function fn() {
            off(event, fn);
            callback.apply(scope || target, arguments);
        }
        return on(event, fn);
    }
    /**
     * ###getListeners###
     * get the listeners from the dispatcher.
     * @param {String} event
     * @returns {*}
     */
    function getListeners(event) {
        return listeners[event];
    }
    /**
     * ###fire###
     * fire the callback with arguments.
     * @param {Function} callback
     * @param {Array} args
     * @returns {*}
     */
    function fire(callback, args) {
        return callback && callback.apply(target, args);
    }
    /**
     * ###dispatch###
     * fire the event and any arguments that are passed.
     * @param {String} event
     */
    function dispatch(event) {
        if (listeners[event]) {
            var i = 0, list = listeners[event], len = list.length;
            while (i < len) {
                fire(list[i], arguments);
                i += 1;
            }
        }
    }
    if (scope && map) {
        target.on = scope[map.on] && scope[map.on].bind(scope);
        target.off = scope[map.off] && scope[map.off].bind(scope);
        target.onOnce = scope[map.onOnce] && scope[map.onOnce].bind(scope);
        target.dispatch = scope[map.dispatch].bind(scope);
    } else {
        target.on = on;
        target.off = off;
        target.onOnce = onOnce;
        target.dispatch = dispatch;
    }
    target.getListeners = getListeners;
}

exports.dispatcher = dispatcher;

/**
 * ###<a name="extend">extend</a>###
 * Perform a deep extend.
 * @param {Object} destination
 * @param {Object=} source
 * return {Object|destination}
 */
function extend(destination, source) {
    var args = exports.util.array.toArray(arguments), i = 1, len = args.length, item, j;
    while (i < len) {
        item = args[i];
        for (j in item) {
            if (destination[j] && typeof destination[j] === "object") {
                destination[j] = extend(destination[j], item[j]);
            } else if (item[j] instanceof Array) {
                destination[j] = extend([], item[j]);
            } else if (item[j] && typeof item[j] === "object") {
                destination[j] = extend({}, item[j]);
            } else {
                destination[j] = item[j];
            }
        }
        i += 1;
    }
    return destination;
}

exports.extend = extend;

(function() {
    "use strict";
    var c = 0;
    exports.uid = function UID() {
        c += 1;
        var str = c.toString(36).toUpperCase();
        while (str.length < 6) {
            str = "0" + str;
        }
        return str;
    };
})();

/**
 * **toArray** Convert arguments or objects to an array.
 * @param {Object|Arguments} obj
 * @returns {Array}
 */
function toArray(obj) {
    var result = [], i = 0, len = obj.length;
    if (obj.length !== undefined) {
        while (i < len) {
            result.push(obj[i]);
            i += 1;
        }
    } else {
        for (i in obj) {
            if (Object.prototype.hasOwnProperty.apply(obj, [ i ])) {
                result.push(obj[i]);
            }
        }
    }
    return result;
}

/**
 * **sort** apply array sort with a custom compare function.
 * > The ECMAScript standard does not guarantee Array.sort is a stable sort.
 * > According to the ECMA spec, when two objects are determined to be equal in a custom sort,
 * > JavaScript is not required to leave those two objects in the same order.
 * > replace sort from ECMAScript with this bubble sort to make it accurate
 */
function sort(ary, compareFn) {
    var c, len, v, rlen, holder;
    if (!compareFn) {
        // default compare function.
        compareFn = function(a, b) {
            return a > b ? 1 : a < b ? -1 : 0;
        };
    }
    len = ary.length;
    rlen = len - 1;
    for (c = 0; c < len; c += 1) {
        for (v = 0; v < rlen; v += 1) {
            if (compareFn(ary[v], ary[v + 1]) > 0) {
                holder = ary[v + 1];
                ary[v + 1] = ary[v];
                ary[v] = holder;
            }
        }
    }
    return ary;
}

exports.util = exports.util || {};

exports.util.array = exports.util.array || {};

exports.util.array.toArray = toArray;

exports.util.array.sort = sort;

exports.logWrapper = function LogWrapper(name, instance, theme, dispatch) {
    theme = theme || "black";
    dispatch = dispatch || instance.dispatch || function() {};
    instance.$logName = name;
    instance.log = instance.info = instance.warn = instance.error = function() {};
    instance.log = function log() {
        var args = [ exports.datagrid.events.LOG, name, theme ].concat(exports.util.array.toArray(arguments));
        dispatch.apply(instance, args);
    };
    instance.info = function info() {
        var args = [ exports.datagrid.events.INFO, name, theme ].concat(exports.util.array.toArray(arguments));
        dispatch.apply(instance, args);
    };
    instance.warn = function warn() {
        var args = [ exports.datagrid.events.WARN, name, theme ].concat(exports.util.array.toArray(arguments));
        dispatch.apply(instance, args);
    };
    instance.error = function error() {
        var args = [ exports.datagrid.events.ERROR, name, theme ].concat(exports.util.array.toArray(arguments));
        dispatch.apply(instance, args);
    };
    instance.destroyLogger = function() {
        if (instance.logger) {
            instance.log("destroy");
            instance.logger.destroy();
            instance.logger = null;
        }
    };
    return instance;
};

function Flow(inst, dispatch) {
    var running = false, intv, current = null, list = [], history = [], historyLimit = 10, uniqueMethods = {}, execStartTime, execEndTime, timeouts = {}, consoleMethodStyle = "color:#666666;";
    function getMethodName(method) {
        // TODO: there might be a faster way to get the function name.
        return method.toString().split(/\b/)[2];
    }
    function createItem(method, args, delay) {
        return {
            label: getMethodName(method),
            method: method,
            args: args || [],
            delay: delay
        };
    }
    function unique(method) {
        var name = getMethodName(method);
        uniqueMethods[name] = method;
    }
    function clearSimilarItemsFromList(item) {
        var i = 0, len = list.length;
        while (i < len) {
            if (list[i].label === item.label && list[i] !== current) {
                inst.log("clear duplicate item %c%s", consoleMethodStyle, item.label);
                list.splice(i, 1);
                i -= 1;
                len -= 1;
            }
            i += 1;
        }
    }
    function add(method, args, delay) {
        var item = createItem(method, args, delay), index = -1;
        if (uniqueMethods[item.label]) {
            clearSimilarItemsFromList(item);
        }
        list.push(item);
        if (running) {
            next();
        }
    }
    // this puts it right after the one currently running.
    function insert(method, args, delay) {
        list.splice(1, 0, createItem(method, args, delay));
    }
    function remove(method) {
        clearSimilarItemsFromList({
            label: getMethodName(method)
        });
    }
    function timeout(method, time) {
        var intv, item = createItem(method, [], time), startTime = Date.now(), timeoutCall = function() {
            inst.log("exec timeout method %c%s %sms", consoleMethodStyle, item.label, Date.now() - startTime);
            method();
        };
        inst.log("wait for timeout method %c%s", consoleMethodStyle, item.label);
        intv = setTimeout(timeoutCall, time);
        timeouts[intv] = function() {
            clearTimeout(intv);
            delete timeouts[intv];
        };
        return intv;
    }
    function stopTimeout(intv) {
        if (timeouts[intv]) timeouts[intv]();
    }
    function getArguments(fn) {
        var str = fn.toString(), match = str.match(/\(.*\)/);
        return match[0].match(/([\$\w])+/gm);
    }
    function hasDoneArg(fn) {
        var args = getArguments(fn);
        return !!(args && args.indexOf("done") !== -1);
    }
    function done() {
        execEndTime = Date.now();
        inst.log("finish %c%s took %dms", consoleMethodStyle, current.label, execEndTime - execStartTime);
        current = null;
        addToHistory(list.shift());
        if (list.length) {
            next();
        }
        return execEndTime - execStartTime;
    }
    // Keep a history of what methods were executed for debugging. Keep up to the limit.
    function addToHistory(item) {
        history.unshift(item);
        while (history.length > historyLimit) {
            history.pop();
        }
    }
    function next() {
        if (!current && list.length) {
            current = list[0];
            if (inst.async && current.delay !== undefined) {
                inst.log("	delay for %c%s %sms", consoleMethodStyle, current.label, current.delay);
                clearTimeout(intv);
                intv = setTimeout(exec, current.delay);
            } else {
                exec();
            }
        }
    }
    function exec() {
        inst.log("start method %c%s", consoleMethodStyle, current.label);
        var methodHasDoneArg = hasDoneArg(current.method);
        if (methodHasDoneArg) current.args.push(done);
        execStartTime = Date.now();
        current.method.apply(null, current.args);
        if (!methodHasDoneArg) done();
    }
    function run() {
        running = true;
        next();
    }
    function clear() {
        var len = current ? 1 : 0, item;
        inst.log("clear");
        while (list.length > len) {
            item = list.splice(len, 1)[0];
            inst.log("	remove %s from flow", item.label);
        }
    }
    function length() {
        return list.length;
    }
    function destroy() {
        clearTimeout(intv);
        list.length = 0;
        inst = null;
    }
    inst = exports.logWrapper("Flow", inst || {}, "grey", dispatch);
    inst.async = Object.prototype.hasOwnProperty.apply(inst, [ "async" ]) ? inst.async : true;
    inst.debug = Object.prototype.hasOwnProperty.apply(inst, [ "debug" ]) ? inst.debug : 0;
    inst.insert = insert;
    inst.add = add;
    inst.unique = unique;
    inst.remove = remove;
    inst.timeout = timeout;
    inst.stopTimeout = stopTimeout;
    inst.run = run;
    inst.clear = clear;
    inst.length = length;
    inst.destroy = destroy;
    return inst;
}

exports.datagrid.Flow = Flow;

/*global each, charPack, Flow, exports, module */
/**
 * <a name="ux.datagrid"></a>
 * ##Datagrid Directive##
 * The datagrid manages the `core addons` to build the initial list and provide the public api necessary
 * to communicate with other addons.
 * Datagrid uses script templates inside of the dom to create your elements. Addons that are added to the addon
 * attribute.
 * @param {Scope} scope
 * @param {DOMElement} element
 * @param {Object} attr
 * @param {Function} $compile
 * @returns {{}}
 * @constructor
 */
function Datagrid(scope, element, attr, $compile) {
    // **<a name="flow">flow</a>** flow management for methods of the datagrid. Keeping functions firing in the correct order especially if async methods are executed.
    var flow;
    // **<a name="waitCount">waitCount</a>** waiting to render. If it fails too many times. it will die.
    var waitCount = 0;
    // **<a name="changeWatcherSet">changeWatcherSet</a>** flag for change watchers.
    var changeWatcherSet = false;
    // **<a name="unwatchers">unwatchers</a>** list of scope listeners that we want to clear on destroy
    var unwatchers = [];
    // **<a name="content">content</a>** the dom element with all of the chunks.
    var content;
    // **<a name="oldContent">oldContent</a>** the temporary content when the grid is being reset.
    var oldContent;
    // **<a name="scopes">scopes</a>** the array of all scopes that have been compiled.
    var scopes = [];
    // **<a name="active">active</a>** the scopes that are currently active.
    var active = [];
    // **<a name="lastVisibleScrollStart">lastVisibleScrollStart</a>** cached index to improve render loop by starting where it left off.
    var lastVisibleScrollStart = 0;
    // **<a name="rowOffsets">rowOffsets</a>** cache for the heights of the rows for faster height calculations.
    var rowOffsets = {};
    // **<a name="viewHeight">viewHeight</a>** the visual area height.
    var viewHeight = 0;
    // **<a name="options">options</a>** configs that are shared through the datagrid and addons.
    var options;
    // **[states](#states)** local reference to the states constants
    var states = exports.datagrid.states;
    // **[events](#events)** local reference to the events constants
    var events = exports.datagrid.events;
    // **<a name="state">state</a>** `state` of the app. Building || Ready.
    var state = states.BUILDING;
    // **<a name="values">values</a>** `values` is the object that is used to share data for scrolling and other shared values.
    var values = {
        // - <a name="values.dirty"></a>if the data is dirty and a render has not happended since the data change.
        dirty: false,
        // - <a name="values.scroll"></a>current scroll value of the grid
        scroll: 0,
        // - <a name="values.speed"></a>current speed of the scroll
        speed: 0,
        // - <a name="values.absSpeed"></a>current absSpeed of the grid.
        absSpeed: 0,
        // - <a name="values.scrollPercent"></a>the current percent position of the scroll.
        scrollPercent: 0,
        // - <a name="values.touchDown"></a>if there is currently a touch start and not a touch end. Since touch is used for scrolling on a touch device. Ignored for desktop.
        touchDown: false,
        // - <a name="values.scrollingStopIntv"></a>interval that allows waits for checks to know when the scrolling has stopped and a render is needed.
        scrollingStopIntv: null,
        // - <a name="values.activeRange"></a>the current range of active scopes.
        activeRange: {
            min: 0,
            max: 0
        }
    };
    // <a name="logEvents"></a>listing the log events so they can be ignored if needed.
    var logEvents = [ exports.datagrid.events.LOG, exports.datagrid.events.INFO, exports.datagrid.events.WARN, exports.datagrid.events.ERROR ];
    // <a name="inst"></a>the instance of the datagrid that will be referenced by all addons.
    var inst = {}, eventLogger = {}, startupComplete = false, gcIntv;
    // wrap the instance for logging.
    exports.logWrapper("datagrid event", inst, "grey", dispatch);
    /**
     * ###<a name="init">init</a>###
     * Initialize the datagrid. Add unique methods to the flow control.
     */
    function init() {
        flow.unique(reset);
        flow.unique(render);
        flow.unique(updateRowWatchers);
    }
    /**
     * ###<a name="setupExports">setupExports</a>###
     * Build out the public api variables for the datagrid.
     */
    function setupExports() {
        inst.uid = exports.uid();
        inst.name = scope.$eval(attr.gridName) || "datagrid";
        inst.scope = scope;
        inst.element = element;
        inst.attr = attr;
        inst.rowsLength = 0;
        inst.scopes = scopes;
        inst.data = inst.data || [];
        inst.unwatchers = unwatchers;
        inst.values = values;
        inst.start = start;
        inst.update = update;
        inst.reset = reset;
        inst.isReady = isReady;
        inst.isStartupComplete = isStartupComplete;
        inst.forceRenderScope = forceRenderScope;
        inst.dispatch = dispatch;
        inst.activateScope = activateScope;
        inst.deactivateScope = deactivateScope;
        inst.render = function() {
            flow.add(render);
        };
        inst.updateHeights = updateHeights;
        inst.getOffsetIndex = getOffsetIndex;
        inst.isActive = isActive;
        inst.isCompiled = isCompiled;
        inst.swapItem = swapItem;
        inst.getScope = getScope;
        inst.getRowItem = getRowItem;
        inst.getRowElm = getRowElm;
        inst.getRowIndex = inst.getIndexOf = getRowIndex;
        inst.getRowOffset = getRowOffset;
        inst.getRowHeight = getRowHeight;
        inst.getViewportHeight = getViewportHeight;
        inst.getContentHeight = getContentHeight;
        inst.getContent = getContent;
        inst.safeDigest = safeDigest;
        inst.getRowIndexFromElement = getRowIndexFromElement;
        inst.updateViewportHeight = updateViewportHeight;
        inst.calculateViewportHeight = calculateViewportHeight;
        inst.options = options = exports.extend({}, exports.datagrid.options, scope.$eval(attr.options) || {});
        inst.flow = flow = new Flow({
            async: Object.prototype.hasOwnProperty.apply(options, [ "async" ]) ? !!options.async : true,
            debug: Object.prototype.hasOwnProperty.apply(options, [ "debug" ]) ? options.debug : 0
        }, inst.dispatch);
        // this needs to be set immediatly so that it will be available to other views.
        inst.grouped = scope.$eval(attr.grouped);
        inst.gc = forceGarbageCollection;
        flow.add(init);
        // initialize core.
        flow.run();
    }
    /**
     * ###<a name="createContent">createContent</a>###
     * The [content](#content) dom element is the only direct child created by the datagrid.
     * It is used so append all of the `chunks` so that the it can be scrolled.
     * If the dom element is provided with the class [content](#content) then that dom element will be used
     * allowing the user to add custom classes directly tot he [content](#content) dom element.
     * @returns {JQLite}
     */
    function createContent() {
        var contents = element[0].getElementsByClassName(options.contentClass), cnt, classes = options.contentClass;
        contents = exports.filter(contents, filterOldContent);
        cnt = contents[0];
        if (cnt) {
            // if there is an old one. Pull the classes from it.
            classes = cnt.className || options.contentClass;
        }
        if (!cnt) {
            classes = getClassesFromOldContent() || classes;
            cnt = angular.element('<div class="' + classes + '"></div>');
            if (inst.options.chunks.detachDom) {
                cnt[0].style.position = "relative";
            }
            element.prepend(cnt);
        }
        if (!cnt[0]) {
            cnt = angular.element(cnt);
        }
        return cnt;
    }
    /**
     * ###<a name="getClassesFromOldContent">getClassesFromOldContent</a>###
     * If the old content exists it may have been an original dom element passed to the datagrid. If so we want
     * to keep that dom elements classes in tact.
     * @returns {string}
     */
    function getClassesFromOldContent() {
        var classes, index;
        if (oldContent) {
            // let's get classes from it.
            classes = exports.util.array.toArray(oldContent[0].classList);
            index = classes.indexOf("old-" + options.contentClass);
            if (index !== -1) {
                classes.splice(index, 1);
            }
            return classes.join(" ");
        }
    }
    /**
     * ###<a name="filterOldContent">filterOldContent</a>###
     * filter the list of content dom to remove any references to the [oldContent][#oldContent].
     * @param cnt
     * @param index
     * @param list
     * @returns {boolean}
     */
    function filterOldContent(cnt, index, list) {
        return angular.element(cnt).hasClass("old-" + options.contentClass) ? false : true;
    }
    /**
     * ###<a name="getContent">getContent</a>###
     * return the reference to the content div.
     */
    function getContent() {
        return content;
    }
    /**
     * ###<a name="start">start</a>###
     * `start` is called after the addons are added.
     */
    function start() {
        inst.dispatch(exports.datagrid.events.ON_INIT);
        content = createContent();
        waitForElementReady(0);
    }
    /**
     * ###<a name="waitForElementReady">waitForElementReady</a>###
     * this waits for the body element because if the grid has been constructed, but no heights are showing
     * it is usually because the grid has not been attached to the document yet. So wait for the heights
     * to be available, but only wait a little then exit.
     * @param count
     */
    function waitForElementReady(count) {
        if (!inst.element[0].offsetHeight) {
            if (count < 1) {
                // if they are doing custom compiling. They may compile before addit it to the dom.
                // allow a pass to happen just in case.
                flow.add(waitForElementReady, [ count + 1 ], 0);
                // retry.
                return;
            } else {
                flow.warn("Datagrid: Dom Element does not have a height.");
            }
        }
        if (options.templateModel && options.templateModel.templates) {
            flow.add(inst.templateModel.createTemplatesFromData, [ options.templateModel.templates ], 0);
        }
        flow.add(inst.templateModel.createTemplates, null, 0);
        // allow element to be added to dom.
        // if the templates have different heights. Then they are dynamic.
        flow.add(function updateDynamicRowHeights() {
            options.dynamicRowHeights = inst.templateModel.dynamicHeights();
        });
        flow.add(addListeners);
    }
    /**
     * ###<a name="addListeners">addListeners</a>###
     * Adds listeners. Notice that all listeners are added to the unwatchers array so that they can be cleared
     * before references are removed to avoid memory leaks with circular references amd to prevent events from
     * being listened to while the destroy is happening.
     */
    function addListeners() {
        var unwatchFirstRender = scope.$on(exports.datagrid.events.ON_BEFORE_RENDER_AFTER_DATA_CHANGE, function() {
            unwatchFirstRender();
            flow.add(onStartupComplete);
        });
        window.addEventListener("resize", onResize);
        unwatchers.push(scope.$on(exports.datagrid.events.UPDATE, update));
        unwatchers.push(scope.$on(exports.datagrid.events.ON_ROW_TEMPLATE_CHANGE, onRowTemplateChange));
        unwatchers.push(scope.$on("$destroy", destroy));
        flow.add(setupChangeWatcher, [], 0);
        inst.dispatch(exports.datagrid.events.ON_LISTENERS_READY);
    }
    function isStartupComplete() {
        return startupComplete;
    }
    function onStartupComplete() {
        startupComplete = true;
        dispatch(exports.datagrid.events.ON_STARTUP_COMPLETE);
    }
    /**
     * ###<a name="setupChangeWatcher">setupChangeWatcher</a>###
     * When a change happens update the dom.
     */
    function setupChangeWatcher() {
        if (!changeWatcherSet) {
            inst.log("setupChangeWatcher");
            changeWatcherSet = true;
            unwatchers.push(scope.$watchCollection(attr.uxDatagrid, onDataChangeFromWatcher));
            // force intial watcher.
            var d = scope.$eval(attr.uxDatagrid);
            if (d && d.length) {
                flow.add(render);
            }
        }
    }
    /**
     * ###<a name="onDataChangeFromWatcher">onDataChangeFromWatcher</a>###
     * when the watcher fires.
     * @param {*} newValue
     * @param {*} oldValue
     * @param {Scope} scope
     */
    function onDataChangeFromWatcher(newValue, oldValue, scope) {
        flow.add(onDataChanged, [ newValue, oldValue ]);
    }
    /**
     * ###<a name="updateViewportHeight">updateViewportHeight</a>###
     * This function can be used to force update the viewHeight.
     */
    function updateViewportHeight() {
        viewHeight = inst.calculateViewportHeight();
    }
    /**
     * ###<a name="isReady">isReady</a>###
     * return if grid state is <a href="#states.READY">states.READY</a>.
     */
    function isReady() {
        return state === states.READY;
    }
    /**
     * ###<a name="calculateViewportHeight">calculateViewportHeight</a>###
     * Calculate Viewport Height can be expensive. Depending on the number of dom elemnts.
     * so if you need to use this method, use it sparingly because you may experience performance
     * issues if overused.
     */
    function calculateViewportHeight() {
        return element[0].offsetHeight;
    }
    /**
     * ###<a name="onResize">onResize</a>###
     * When a resize happens dispatch that event for addons to listen to so events happen after
     * the grid has performed it's changes.
     * @param {Event} event
     */
    function onResize(event) {
        // we need to wait a moment for the browser to finish the resize, then adjust and fire the event.
        flow.add(updateHeights, [], 100);
    }
    /**
     * ##<a name="swapItem">swapItem</a>##
     * swap out an old item with a new item without causing a data change. Quick swap of items.
     * this will only work if the item already exists in the datagrid. You cannot add or remove items
     * this way. Only change them to a different reference. Adding or Removing requires a re-chunking.
     * @param {Object} oldItem
     * @param {Object} newItem
     * @param {Boolean=} keepTemplate
     */
    function swapItem(oldItem, newItem, keepTemplate) {
        //TODO: needs unit test.
        var index = getRowIndex(oldItem), oldTpl, newTpl;
        if (Object.prototype.hasOwnProperty.apply(inst.data, [ index ])) {
            oldTpl = inst.templateModel.getTemplate(oldItem);
            if (keepTemplate) {
                newTpl = oldTpl;
            } else {
                newTpl = inst.templateModel.getTemplate(newItem);
            }
            inst.normalizeModel.replace(newItem, index);
            if (oldTpl !== newTpl) {
                inst.templateModel.setTemplate(index, newTpl);
            } else {
                // nothing changed except the reference. So just update the scope and digest.
                scopes[index][newTpl.item] = newItem;
                safeDigest(scopes[index]);
            }
        }
    }
    /**
     * ###<a name="getScope">getScope</a>###
     * Return the scope of the row at that index.
     * @param {Number} index
     * @returns {*}
     */
    function getScope(index) {
        return scopes[index];
    }
    /**
     * ###<a name="getRowItem">getRowItem</a>###
     * Return the data item of that row.
     * @param {Number} index
     * @returns {*}
     */
    function getRowItem(index) {
        return this.getData()[index];
    }
    /**
     * ###<a name="getRowElm">getRowElm</a>###
     * Return the dom element at that row index.
     * @param {Number} index
     * @returns {element|*}
     */
    function getRowElm(index) {
        return angular.element(inst.chunkModel.getRow(index));
    }
    /**
     * ###<a name="isCompiled">isCompiled</a>###
     * Return if the row is compiled or not.
     * @param {Number} index
     * @returns {boolean}
     */
    function isCompiled(index) {
        return !!scopes[index];
    }
    /**
     * ###<a name="getRowIndex">getRowIndex</a>###
     * Get the index of a row from a reference the data object of a row.
     * @param {Number} item
     * @returns {*}
     */
    function getRowIndex(item) {
        return inst.getNormalizedIndex(item, 0);
    }
    /**
     * ###<a name="getRowIndexFromElement">getRowIndexFromElement</a>###
     * Get the index of a row from a reference to a dom element that is contained within a row.
     * @param {JQLite|DOMElement} el
     * @returns {*}
     */
    function getRowIndexFromElement(el) {
        if (element[0].contains(el[0] || el)) {
            el = el.scope ? el : angular.element(el);
            var s = el.scope();
            if (s === inst.scope) {
                throw new Error("Unable to get row scope... something went wrong.");
            }
            // make sure we get the right scope to grab the index from. We need to get it from a row.
            while (s && s.$parent && s.$parent !== inst.scope) {
                s = s.$parent;
            }
            return s.$index;
        }
        return -1;
    }
    /**
     * ###<a name="getRowOffset">getRowOffset</a>###
     * Return the scroll offset of a row by it's index. All offsets are cached, they get updated if
     * a row template changes, because it may change it height as well.
     * @param {Number} index
     * @returns {*}
     */
    function getRowOffset(index) {
        if (rowOffsets[index] === undefined) {
            if (options.dynamicRowHeights) {
                // dynamicRowHeights should be set by the templates.
                updateHeightValues();
            } else {
                rowOffsets[index] = index * options.rowHeight;
            }
        }
        return rowOffsets[index];
    }
    /**
     * ###<a name="getRowHeight">getRowHeight</a>###
     * Return the cached height of a row by index.
     * @param {Number} index
     * @returns {Number}
     */
    function getRowHeight(index) {
        return inst.templateModel.getTemplateHeight(inst.data[index]);
    }
    /**
     * ###<a name="getViewportHeight">getViewportHeight</a>###
     * Return the height of the viewable area of the datagrid.
     */
    function getViewportHeight() {
        return viewHeight;
    }
    /**
     * ###<a name="getConentHeight">getContentHeight</a>###
     * Return the total height of the content of the datagrid.
     */
    function getContentHeight() {
        var list = inst.chunkModel.getChunkList();
        return list && list.height || 0;
    }
    /**
     * ###<a name="createDom">createDom</a>###
     * This starts off the chunking. It creates all of the dom chunks, rows, etc for the datagrid.
     * @param {Array} list
     */
    function createDom(list) {
        //TODO: if there is any dom. It needs destroyed first.
        inst.log("OVERWRITE DOM!!!");
        var len = list.length;
        // this async is important because it allows the updateRowWatchers on first digest to escape the current digest.
        inst.chunkModel.chunkDom(list, options.chunks.size, '<div class="' + options.chunks.chunkClass + '">', "</div>", content);
        inst.rowsLength = len;
        inst.log("created %s dom elements", len);
    }
    /**
     * ###<a name="compileRow">compileRow</a>###
     * Compile a row at that index. This creates the scope for that row when compiled. It does not perform a digest.
     * @param {Number} index
     * @returns {*}
     */
    function compileRow(index) {
        var s = scopes[index], prev, tpl, el;
        if (!s) {
            s = scope.$new();
            prev = getScope(index - 1);
            tpl = inst.templateModel.getTemplate(inst.data[index]);
            if (prev) {
                prev.$$nextSibling = s;
                s.$$prevSibling = prev;
            }
            s.$status = options.compiledClass;
            s[tpl.item] = inst.data[index];
            // set the data to the scope.
            s.$index = index;
            scopes[index] = s;
            el = getRowElm(index);
            el.removeClass(options.uncompiledClass);
            $compile(el)(s);
            inst.dispatch(exports.datagrid.events.ON_ROW_COMPILE, s, el);
            deactivateScope(s);
        }
        return s;
    }
    /**
     * ###<a name="buildRows">buildRows</a>###
     * Set the state to <a name="states.BUILDING">states.BUILDING</a>. Then build the dom.
     * @param {Array} list
     * @param {Boolean=} forceRender
     */
    function buildRows(list, forceRender) {
        inst.log("	buildRows %s", list.length);
        state = states.BUILDING;
        createDom(list);
        flow.add(updateHeightValues, 0);
        if (!isReady()) {
            flow.add(ready);
        }
        if (forceRender) {
            flow.add(render);
        }
    }
    /**
     * ###<a name="ready">ready</a>###
     * Set the state to <a href="states.ON_READY">states.READY</a> and start the first render.
     */
    function ready() {
        inst.log("	ready");
        state = states.READY;
        flow.add(fireReadyEvent);
        flow.add(safeDigest, [ scope ]);
    }
    /**
     * ###<a name="fireReadyEvent">fireReadyEvent</a>###
     * Fire the <a name="events.ON_READY">events.ON_READY</a>
     */
    function fireReadyEvent() {
        scope.$emit(exports.datagrid.events.ON_READY);
    }
    /**
     * ###<a name="safeDigest">safeDigest</a>###
     * SafeDigest by checking the render phase of the scope before rendering.
     * while this is not recommended by angular it is effective.
     * @param {Scope} s
     */
    function safeDigest(s) {
        //        s.$evalAsync();// this sometimes takes too long so I see {{}} brackets briefly.
        var ds = s;
        while (ds) {
            if (ds.$$phase) {
                return;
            }
            ds = ds.$parent;
        }
        s.$digest();
    }
    /**
     * ###<a name="applyEventCounts">applyEventCounts</a>###
     * Take all of the counts that we have and move up the parent chain subtracting them from the totals
     * so that event listeners do not get stuck on broadcast.
     * @param {Scope} s
     * @param {Object} listenerCounts
     * @param {Function} fn
     */
    function applyEventCounts(s, listenerCounts, fn) {
        while (s) {
            for (var eventName in listenerCounts) {
                if (Object.prototype.hasOwnProperty.apply(listenerCounts, [ eventName ])) {
                    fn(s, listenerCounts, eventName);
                }
            }
            s = s.$parent;
        }
    }
    /**
     * ###<a name="addEvents">addEvents</a>###
     * Take all of the counts that we have and move up the parent chain adding them from the totals
     * so that event listeners have them back for broadcast events.
     * @param {Scope} s
     * @param {Object} listenerCounts
     */
    function addEvents(s, listenerCounts) {
        applyEventCounts(s, listenerCounts, addEvent);
    }
    /**
     * ###<a name="addEvent">addEvent</a>####
     * Add the event to the $$listenerCount.
     * @param {Scope} s
     * @param {Object} listenerCounts
     * @param {String} eventName
     */
    function addEvent(s, listenerCounts, eventName) {
        //console.log("%c%s.$$listenerCount[%s] %s + %s = %s", "color:#009900", s.$id, eventName, s.$$listenerCount[eventName], listenerCounts[eventName], s.$$listenerCount[eventName] + listenerCounts[eventName]);
        s.$$listenerCount[eventName] += listenerCounts[eventName];
    }
    /**
     * ###<a name="subtractEvents">subtractEvents</a>###
     * Take all of the counts that we have and move up the parent chain subtracting them from the totals
     * so that event listeners do not get stuck on broadcast.
     * @param {Scope} s
     * @param {Object} listenerCounts
     */
    function subtractEvents(s, listenerCounts) {
        applyEventCounts(s, listenerCounts, subtractEvent);
    }
    /**
     * ###<a name="subtractEvent">subtractEvent</a>###
     * Take the count of events away from the $$listenerCount
     * @param {Scope} s
     * @param {Object} listenerCounts
     * @param {String} eventName
     */
    function subtractEvent(s, listenerCounts, eventName) {
        s.$$listenerCount[eventName] -= listenerCounts[eventName];
    }
    /**
     * ###<a name="desctivateScope">deactivateScope</a>###
     * One of the core features to the datagrid's performance it the ability to make only the scopes
     * that are in view to render. This deactivates a scope by removing it's $$watchers that angular
     * uses to know that it needs to digest. Thus inactivating the row. We also remove all watchers from
     * child scopes recursively storing them on each child in a separate variable to activation later.
     * They need to be reactivated before being destroyed for proper cleanup.
     * $$childHead and $$nextSibling variables are also updated for angular so that it will not even iterate
     * over a scope that is deactivated. It becomes completely hidden from the digest.
     * @param {Scope} s
     * @param {Number=} depth
     * @returns {boolean}
     */
    function deactivateScope(s, depth) {
        var child;
        depth = depth || 0;
        // if the scope is not created yet. just skip.
        if (s && !isActive(s)) {
            // do not deactivate one that is already deactivated.
            if (!depth) {
                s.$emit(exports.datagrid.events.ON_BEFORE_ROW_DEACTIVATE);
            }
            s.$$$watchers = s.$$watchers;
            s.$$watchers = [];
            if (!depth) {
                // only do this on the first depth so we do not recursively reset counts.
                s.$$$listenerCount = s.$$listenerCount;
                s.$$listenerCount = angular.copy(s.$$$listenerCount);
                subtractEvents(s, s.$$$listenerCount);
            }
            //RECURSIVE deactivate/activate memory tests show that it doesn't improve anything. So unless there is a good reason leave
            // this code commented out, because it does affect performance. It adds 30% to destroy time and time to rendering.
            // recursively go through children and deactivate them.
            //            if (s.$$childHead) {
            //                child = s.$$childHead;
            //                while (child) {
            //                    deactivateScope(child, depth + 1);
            //                    child = child.$$nextSibling;
            //                }
            //            }
            return true;
        }
        return false;
    }
    /**
     * ###<a name="activateScope">activateScope</a>###
     * Taking a scope that is deactivated the watchers that it did have are now stored on $$$watchers and
     * can be put back to $$watchers so angular will pick up this scope on a digest. This is done recursively
     * though child scopes as well to activate them. It also updates the linking $$childHead and $$nextSiblings
     * to fully make sure the scope is as if it was before it was deactivated.
     * @param {Scope} s
     * @param {Number=} depth
     * @returns {boolean}
     */
    function activateScope(s, depth) {
        var child;
        depth = depth || 0;
        if (s && s.$$$watchers) {
            // do not activate one that is already active.
            s.$$watchers = s.$$$watchers;
            s.$$$watchers = null;
            if (!depth) {
                addEvents(s, s.$$$listenerCount);
                s.$$$listenerCount = null;
            }
            // recursively go through children and activate them.
            //            if (s.$$childHead) {
            //                child = s.$$childHead;
            //                while (child) {
            //                    activateScope(child, depth + 1);
            //                    child = child.$$nextSibling;
            //                }
            //            }
            if (!depth) {
                s.$emit(exports.datagrid.events.ON_AFTER_ROW_ACTIVATE);
            }
            return true;
        }
        return !!(s && !s.$$$watchers);
    }
    /**
     * ###<a name="isActive">isActive</a>###
     * Check a scope by index to see if it is active.
     * @param {Number} index
     * @returns {boolean}
     */
    function isActive(index) {
        var s = scopes[index];
        return !!(s && !s.$$$watchers);
    }
    /**
     * ###<a name="getOffsetIndex">getOffsetIndex</a>###
     * Given a scroll offset, get the index that is closest to that scroll offset value.
     * @param {Number} offset
     * @returns {number}
     */
    function getOffsetIndex(offset) {
        // updateHeightValues must be called before this.
        var est = Math.floor(offset / inst.templateModel.averageTemplateHeight()), i = 0, len = inst.rowsLength;
        if (!offset || inst.rowsLength < 2) {
            return i;
        }
        if (rowOffsets[est] && rowOffsets[est] <= offset) {
            i = est;
        }
        while (i < len) {
            if (rowOffsets[i] <= offset && rowOffsets[i + 1] > offset) {
                return i;
            }
            i += 1;
        }
        return i;
    }
    /**
     * ###<a name="getStartingIndex">getStartingIndex</a>###
     * Because the datagrid can render as many as 50k rows. It becomes necessary to optimize loops by
     * determining the index to start checking for deactivated and activated scopes at instead of iterating
     * all of the items. This greatly improves a render because it only iterates from where the last render was.
     * It does this by taking the last first active element and then counting from there till we get to the top
     * of the start area. So we never have to loop the whole thing.
     * @returns {{startIndex: number, i: number, inc: number, end: number, visibleScrollStart: number, visibleScrollEnd: number}}
     */
    function getStartingIndex() {
        if (values.dirty && inst.chunkModel.getChunkList() && inst.chunkModel.getChunkList().height - inst.getViewportHeight() < values.scroll) {
            // We are trying to start the scroll off at a height that is taller than we have in the list.
            // reset scroll to 0.
            inst.info("Scroll reset because either there is no data or the scroll is taller than there is scroll area");
            values.scroll = 0;
        }
        var height = viewHeight, scroll = values.scroll >= 0 ? values.scroll : 0, result = {
            startIndex: 0,
            i: 0,
            inc: 1,
            end: inst.rowsLength,
            visibleScrollStart: scroll + options.cushion,
            visibleScrollEnd: scroll + height - options.cushion
        };
        result.startIndex = result.i = getOffsetIndex(scroll);
        if (inst.rowsLength && result.startIndex === result.end) {
            throw new Error(exports.errors.E1002);
        }
        return result;
    }
    /**
     * ###<a name="updateHeightValues">updateHeightValues</a>###
     * invalidate and update all height values of the chunks and rows.
     */
    function updateHeightValues() {
        //TODO: this is going to be updated to use ChunkArray data to be faster.
        var height = 0, i = 0, contentHeight;
        while (i < inst.rowsLength) {
            rowOffsets[i] = height;
            height += inst.templateModel.getTemplateHeight(inst.data[i]);
            i += 1;
        }
        options.rowHeight = inst.rowsLength ? inst.templateModel.getTemplateHeight("default") : 0;
        contentHeight = getContentHeight();
        inst.getContent()[0].style.height = contentHeight + "px";
        inst.log("heights: viewport %s content %s", inst.getViewportHeight(), contentHeight);
    }
    /**
     * ###<a name="updateRowWatchers">updateRowWatchers</a>###
     * This is the core of the datagird rendering. It determines the range of scopes to be activated and
     * deactivates any scopes that were active before that are not still active.
     */
    function updateRowWatchers() {
        var loop = getStartingIndex(), offset = loop.i * 40, lastActive = [].concat(active), lastActiveIndex, s, prevS;
        if (loop.i < 0) {
            // then scroll is negative. ignore it.
            return;
        }
        inst.dispatch(events.ON_BEFORE_UPDATE_WATCHERS, loop);
        // we only want to update stuff if we are scrolling slow.
        resetMinMax();
        // this needs to always be set after the dispatch of before update watchers in case they need the before activeRange.
        active.length = 0;
        // make sure not to reset until after getStartingIndex.
        inst.log("	scroll %s visibleScrollStart %s visibleScrollEnd %s", values.scroll, loop.visibleScrollStart, loop.visibleScrollEnd);
        while (loop.i < inst.rowsLength) {
            prevS = scope.$$childHead ? scopes[loop.i - 1] : null;
            offset = getRowOffset(loop.i);
            // this is where the chunks and rows get created is when they are requested if they don't exist.
            if (offset >= loop.visibleScrollStart && offset <= loop.visibleScrollEnd) {
                s = compileRow(loop.i);
                // only compiles if it is not already compiled. Still returns the scope.
                if (loop.started === undefined) {
                    loop.started = loop.i;
                }
                updateMinMax(loop.i);
                if (activateScope(s)) {
                    inst.getRowElm(loop.i).attr("status", "active");
                    lastActiveIndex = lastActive.indexOf(loop.i);
                    if (lastActiveIndex !== -1) {
                        lastActive.splice(lastActiveIndex, 1);
                    }
                    // make sure to put them into active in the right order.
                    active.push(loop.i);
                    safeDigest(s);
                    s.$digested = true;
                }
            }
            loop.i += loop.inc;
            // optimize the loop
            if (loop.inc > 0 && offset > loop.visibleScrollEnd || loop.inc < 0 && offset < loop.visibleScrollStart) {
                break;
            }
        }
        loop.ended = loop.i - 1;
        if (inst.rowsLength && values.activeRange.min < 0 && values.activeRange.max < 0) {
            throw new Error(exports.errors.E1002);
        }
        inst.log("	startIndex %s endIndex %s", loop.startIndex, loop.i);
        deactivateList(lastActive);
        lastVisibleScrollStart = loop.visibleScrollStart;
        inst.log("	activated %s", active.join(", "));
        updateLinks();
        // update the $$childHead and $$nextSibling values to keep digest loops at a minimum count.
        // this dispatch needs to be after the digest so that it doesn't cause {} to show up in the render.
        inst.dispatch(events.ON_AFTER_UPDATE_WATCHERS, loop);
    }
    /**
     * ###<a name="deactivateList">deactivateList</a>###
     * Deactivate a list of scopes.
     */
    function deactivateList(lastActive) {
        var lastActiveIndex, deactivated = [];
        while (lastActive.length) {
            lastActiveIndex = lastActive.pop();
            deactivated.push(lastActiveIndex);
            deactivateScope(scopes[lastActiveIndex]);
            inst.getRowElm(lastActiveIndex).attr("status", "inactive");
        }
        inst.log("	deactivated %s", deactivated.join(", "));
    }
    /**
     * ###<a name="updateLinks">updateLinks</a>###
     * Updates the $$childHead, $$childTail, $$nextSibling, and $$prevSibling values from the parent scope to completely
     * hide scopes that are deactivated from angular's knowledge so digest loops are as small as possible.
     */
    function updateLinks() {
        if (active.length) {
            var lastIndex = active[active.length - 1], i = 0, len = active.length, s;
            scope.$$childHead = scopes[active[0]];
            scope.$$childTail = scopes[lastIndex];
            while (i < len) {
                s = scopes[active[i]];
                s.$$prevSibling = scopes[active[i - 1]];
                s.$$nextSibling = scopes[active[i + 1]];
                s.$parent = scope;
                i += 1;
            }
        }
    }
    /**
     * ###<a name="resetMinMax">resetMinMax</a>###
     * resets the min and max of the activeRange for what is activated.
     */
    function resetMinMax() {
        values.activeRange.min = values.activeRange.max = -1;
    }
    /**
     * ###<a name="updateMinMax">updateMinMax</a>###
     * takes an index that has just been activated and updates the min and max
     */
    // values for later calculations to know the range.
    function updateMinMax(activeIndex) {
        values.activeRange.min = values.activeRange.min < activeIndex && values.activeRange.min >= 0 ? values.activeRange.min : activeIndex;
        values.activeRange.max = values.activeRange.max > activeIndex && values.activeRange.max >= 0 ? values.activeRange.max : activeIndex;
    }
    /**
     * ###<a name="beforeRenderAfterDataChange">beforeRenderAfterDataChange</a>###
     * fired just before the update watchers are applied if the data has changed.
     */
    function beforeRenderAfterDataChange() {
        if (values.dirty) {
            dispatch(exports.datagrid.events.ON_BEFORE_RENDER_AFTER_DATA_CHANGE);
        }
    }
    /**
     * ###<a name="afterRenderAfterDataChange">afterRenderAfterDataChange</a>###
     * after the data has changed this is fired after the following render.
     */
    function afterRenderAfterDataChange() {
        var tplHeight;
        if (values.dirty && values.activeRange.max >= 0) {
            values.dirty = false;
            tplHeight = getRowElm(values.activeRange.min)[0].offsetHeight;
            if (inst.getData().length && tplHeight !== inst.templateModel.getTemplateHeight(inst.getData()[values.activeRange.min])) {
                inst.templateModel.updateTemplateHeights();
            }
            dispatch(exports.datagrid.events.ON_RENDER_AFTER_DATA_CHANGE);
        }
    }
    /**
     * ###<a name="readyToRender">readyToRender</a>###
     * the datagrid requires a height to be able to render. If the datagrid is compiled
     * and not added to the dom it will not have a height until added to the dom. If this fails it will wait till the next
     * frame to check the height. If that fails it exits.
     */
    function readyToRender() {
        if (!viewHeight) {
            waitCount += 1;
            if (waitCount < 2) {
                inst.info("datagrid is waiting for element to have a height.");
                flow.add(inst.updateViewportHeight, null, 0);
                // have it wait a moment for the height to change.
                flow.add(render);
            } else {
                flow.warn("Datagrid: Unable to determine a height for the datagrid. Cannot render. Exiting.");
            }
            return false;
        }
        if (waitCount) {
            inst.info("datagrid has height of %s.", viewHeight);
        }
        return true;
    }
    /**
     * ###<a name="render">render</a>###
     * depending on the state of the datagrid this will create necessary dom, compile rows, or
     * digest <a href="#activeRange">activeRange</a> of rows.
     */
    function render() {
        inst.log("render");
        if (readyToRender()) {
            waitCount = 0;
            inst.log("	render %s", state);
            // Where [states.BUILDING](#states.BUILDING) is used
            if (state === states.BUILDING) {
                buildRows(inst.data);
            } else if (state === states.READY) {
                inst.dispatch(exports.datagrid.events.ON_BEFORE_RENDER);
                flow.add(beforeRenderAfterDataChange);
                flow.add(updateRowWatchers);
                // this wait allows rows to finish calculating their heights and finish the digest before firing.
                flow.add(afterRenderAfterDataChange, null, 0);
                //                flow.add(destroyOldContent);
                flow.add(inst.dispatch, [ exports.datagrid.events.ON_AFTER_RENDER ]);
            } else {
                throw new Error(exports.errors.E1001);
            }
        } else {
            inst.log("	not ready to render.");
        }
    }
    /**
     * ###<a name="update">update</a>###
     * force the datagrid to fire a data change update.
     */
    function update() {
        inst.warn("force update");
        onDataChanged(scope.$eval(attr.uxDatagrid), inst.data);
    }
    /**
     * ###<a name="dirtyCheckData">dirtyCheckData</a>###
     * Compare the new and the old value. If the item number is the same, and no templates
     * have changed. Than just update the scopes and run the watchers instead of doing a reset.
     * @param {Array} newVal
     * @param {Array} oldVal
     */
    function dirtyCheckData(newVal, oldVal) {
        //TODO: this needs unit tested.
        if (newVal && oldVal && newVal.length === oldVal.length) {
            var i = 0, len = newVal.length;
            while (i < len) {
                if (dirtyCheckItemTemplate(newVal[i], oldVal[i])) {
                    return true;
                }
                i += 1;
            }
            if (inst.data.length !== inst.normalize(newVal, inst.grouped).length) {
                inst.log("	dirtyCheckData length is different");
                return true;
            }
            return false;
        }
        return true;
    }
    /**
     * ###<a name="dirtyCheckItemTemplate">dirtyCheckItemTemplate</a>###
     * check to see if the template for the item has changed
     * @param {*} newItem
     * @param {*} oldItem
     */
    function dirtyCheckItemTemplate(newItem, oldItem) {
        if (inst.templateModel.getTemplate(newItem) !== inst.templateModel.getTemplate(oldItem)) {
            inst.log("	dirtyCheckData row template changed");
            return true;
        }
        return false;
    }
    /**
     * ###<a name="mapData">mapData</a>###
     * map the new data to the old data object and update the scopes.
     */
    function mapData(newVal) {
        inst.log("	mapData()");
        inst.data = inst.setData(newVal, inst.grouped) || [];
        exports.each(inst.getData(), updateScope);
    }
    /**
     * ###<a name="updateScope">updateScope</a>###
     * update the scope at that index with the new item.
     */
    function updateScope(item, index) {
        var tpl;
        if (scopes[index]) {
            tpl = inst.templateModel.getTemplate(item);
            scopes[index][tpl.item] = item;
        }
    }
    /**
     * ###<a name="onDataChanged">onDataChanged</a>###
     * when the data changes. It is compared by reference, not value for speed
     * (this is the default angular setting).
     */
    function onDataChanged(newVal, oldVal) {
        inst.log("onDataChanged");
        inst.grouped = scope.$eval(attr.grouped);
        if (oldVal !== inst.getOriginalData()) {
            oldVal = inst.getOriginalData();
        }
        if (!inst.options.smartUpdate || !inst.data.length || dirtyCheckData(newVal, oldVal)) {
            var evt = dispatch(exports.datagrid.events.ON_BEFORE_DATA_CHANGE, newVal, oldVal);
            if (evt.defaultPrevented && evt.newValue) {
                newVal = evt.newValue;
            }
            values.dirty = true;
            flow.add(changeData, [ newVal, oldVal ]);
        } else {
            // we just want to update the data values and scope values, because no tempaltes changed.
            values.dirty = true;
            mapData(newVal);
            render();
        }
    }
    function changeData(newVal, oldVal) {
        inst.log("	changeData");
        dispatch(exports.datagrid.events.ON_BEFORE_RESET);
        inst.data = inst.setData(newVal, inst.grouped) || [];
        dispatch(exports.datagrid.events.ON_AFTER_DATA_CHANGE, inst.data, oldVal);
        reset();
    }
    /**
     * ###<a name="reset">reset</a>###
     * clear all and rebuild.
     */
    function reset() {
        inst.info("reset start");
        flow.clear();
        // we are going to clear all in the flow before doing a reset.
        //        state = states.BUILDING;
        destroyScopes();
        // now destroy all of the dom.
        rowOffsets = {};
        active.length = 0;
        scopes.length = 0;
        // keep reference to the old content and add a class to it so we can tell it is old. We will remove it after the render.
        content.children().unbind();
        content.children().remove();
        // make sure scopes are destroyed before this level and listeners as well or this will create a memory leak.
        if (inst.chunkModel.getChunkList()) {
            inst.chunkModel.reset(inst.data, content, scopes);
            inst.rowsLength = inst.data.length;
            updateHeights();
        } else {
            buildRows(inst.data, true);
        }
        flow.add(inst.info, [ "reset complete" ]);
        flow.add(dispatch, [ exports.datagrid.events.ON_AFTER_RESET ], 0);
    }
    /**
     * ###<a name="forceRenderScope">forceRenderScope</a>###
     * used to force a row to render and digest that may not be within
     * the <a href="#values.activeRange">activeRange</a>
     * @param {Number} index
     */
    function forceRenderScope(index) {
        var s = scopes[index];
        //        inst.log("\tforceRenderScope %s", index);
        if (!s && index >= 0 && index < inst.rowsLength) {
            s = compileRow(index);
        }
        if (s && !scope.$$phase) {
            activateScope(s);
            s.$digest();
            deactivateScope(s);
            s.$digested = true;
        }
    }
    /**
     * ###<a name="onRowTemplateChange">onRowTemplateChange</a>###
     * when changing the template for an individual row.
     * @param {Event} evt
     * @param {*) item
     * @param {Object} oldTemplate
     * @param {Object} newTemplate
     * @param {Array} classes
     */
    function onRowTemplateChange(evt, item, oldTemplate, newTemplate, classes) {
        var index = inst.getNormalizedIndex(item), el = getRowElm(index), s = el.hasClass(options.uncompiledClass) ? compileRow(index) : el.scope(), replaceEl, newScope;
        if (s !== scope) {
            replaceEl = angular.element(inst.templateModel.getTemplateByName(newTemplate).template);
            replaceEl.addClass(options.uncompiledClass);
            while (classes && classes.length) {
                replaceEl.addClass(classes.shift());
            }
            el.parent()[0].insertBefore(replaceEl[0], el[0]);
            s.$destroy();
            el.remove();
            scopes[index] = null;
            updateHeights(index);
        }
    }
    /**
     * ###<a name="updateHeights">updateHeights</a>###
     * force invalidation of heights and recalculate them then render.
     * If a rowIndex is specified, only update ones affected by that row, otherwise update all.
     * @param {Number=} rowIndex
     */
    function updateHeights(rowIndex) {
        flow.add(updateViewportHeight);
        flow.add(inst.chunkModel.updateAllChunkHeights, [ rowIndex ]);
        flow.add(updateHeightValues, 0);
        flow.add(updateViewportHeight);
        flow.add(function() {
            var maxScrollHeight = inst.getContentHeight() - inst.getViewportHeight();
            if (values.scroll > maxScrollHeight) {
                values.scroll = maxScrollHeight;
            }
        });
        flow.add(inst.dispatch, [ exports.datagrid.events.ON_AFTER_HEIGHTS_UPDATED ]);
        flow.add(render);
        flow.add(inst.dispatch, [ exports.datagrid.events.ON_AFTER_HEIGHTS_UPDATED_RENDER ]);
    }
    /**
     * ###<a name="isLogEvent">isLogEvent</a>###
     * used to compare events to detect log events.
     * @param {String} evt
     * @returns {boolean}
     */
    function isLogEvent(evt) {
        return logEvents.indexOf(evt) !== -1;
    }
    /**
     * ###<a name="dispatch">dispatch</a>###
     * handle dispaching of events from the datagrid.
     * @param {String} event
     * @returns {Object}
     */
    function dispatch(event) {
        if (!isLogEvent(event) && options.debug) eventLogger.log("$emit %s", event);
        // THIS SHOULD ONLY EMIT. Broadcast could perform very poorly especially if there are a lot of rows.
        return scope.$emit.apply(scope, arguments);
    }
    function forceGarbageCollection() {
        // concept is to crate a large object that will cause the browser to garbage collect before creating it.
        // then since it has no reference it gets removed.
        clearInterval(gcIntv);
        if (!inst.shuttingDown) {
            gcIntv = setTimeout(function() {
                if (inst) {
                    inst.info("GC");
                    var a, i, total = 1024 * 1024 * .5;
                    for (i = 0; i < total; i += 1) {
                        a = .5;
                    }
                }
            }, 1e3);
        }
    }
    /**
     * ###<a name="destroyScopes">destroyScopes</a>###
     * used to destroy the scopes of all rows in the datagrid that are compiled.
     */
    function destroyScopes() {
        // because child scopes may not be in order because of rendering techniques. We must loop through
        // all scopes and destroy them manually.
        var lastScope, nextScope, i = 0;
        each(scopes, function(s, index) {
            // listeners should be destroyed with the angular destroy.
            if (s) {
                s.$$prevSibling = lastScope || undefined;
                i = index;
                while (!nextScope && i < inst.rowsLength) {
                    i += 1;
                    nextScope = scopes[i] || undefined;
                }
                activateScope(s);
                lastScope = s;
                s.$destroy();
            }
        });
        scope.$$childHead = undefined;
        scope.$$childTail = undefined;
        scopes.length = 0;
    }
    /**
     * ###<a name="destroy">destroy</a>###
     * needs to put all watcher back before destroying or it will not destroy child scopes, or remove watchers.
     */
    function destroy() {
        inst.shuttingDown = true;
        getContent()[0].style.display = "none";
        scope.datagrid = null;
        // we have a circular reference. break it on destroy.
        inst.log("destroying grid");
        window.removeEventListener("resize", onResize);
        clearTimeout(values.scrollingStopIntv);
        // destroy flow.
        flow.destroy();
        inst.flow = undefined;
        flow = null;
        // destroy watchers.
        while (unwatchers.length) {
            unwatchers.pop()();
        }
        inst.destroyLogger();
        // now remove every property on exports.
        for (var i in inst) {
            if (inst[i] && inst[i].hasOwnProperty("destroy")) {
                inst[i].destroy();
                inst[i] = null;
            }
        }
        //activate scopes so they can be destroyed by angular.
        destroyScopes();
        element.remove();
        // this seems to be the most memory efficient way to remove elements.
        delete scope.$parent[inst.name];
        rowOffsets = null;
        inst = null;
        scope = null;
        element = null;
        attr = null;
        unwatchers = null;
        content = null;
        active.length = 0;
        active = null;
        scopes.length = 0;
        scopes = null;
        values = null;
        states = null;
        events = null;
        options = null;
        values = null;
        logEvents = null;
        $compile = null;
    }
    exports.logWrapper("datagrid", inst, "green", dispatch);
    exports.logWrapper("events", eventLogger, "light", dispatch);
    scope.datagrid = inst;
    setupExports();
    return inst;
}

/**
 * ###<a name="uxDatagrid">uxDatagrid</a>###
 * define the directive, setup addons, apply core addons then optional addons.
 */
module.directive("uxDatagrid", [ "$compile", "gridAddons", function($compile, gridAddons) {
    return {
        restrict: "AE",
        scope: true,
        link: {
            pre: function(scope, element, attr) {
                var inst = new Datagrid(scope, element, attr, $compile);
                each(exports.datagrid.coreAddons, function(method) {
                    method.apply(inst, [ inst ]);
                });
                gridAddons(inst, attr.addons);
            },
            post: function(scope, element, attr) {
                scope.datagrid.start();
            }
        }
    };
} ]);

/**
 * ###chunkModel###
 * Because the browser has low performance on dom elements that exist in high numbers and are all
 * siblings chunking is used to break them up into limits of their number and their parents and so on.
 * So think of it as every chunk not having more than X number of children weather those children be
 * chunks or they be rows.
 *
 * This speeds up the browser significantly because a resize event from a dom element will not affect
 * all of them, but just those direct siblings and then it's parents siblings and so on up the chain.
 *
 * @param {Datagrid} inst
 * @returns {{}}
 */
exports.datagrid.coreAddons.chunkModel = function chunkModel(inst) {
    var _list, _rows, _chunkSize, _el, result = exports.logWrapper("chunkModel", {}, "purple", inst.dispatch), _templateStartCache, _templateEndCache, _cachedDomRows = [];
    /**
     * **getChunkList**
     * Return the list that was created.
     * @returns {ChunkArray}
     */
    function getChunkList() {
        return _list;
    }
    /**
     * Create a ChunkArray from the array of data that is passed.
     * The array that is passed should not be multi-dimensional. This will only work with a single
     * dimensional array.
     * @param {Array} list
     * @param {Number} size
     * @param {String} templateStart
     * @param {String} templateEnd
     * @returns {ChunkArray}
     */
    function chunkList(list, size, templateStart, templateEnd) {
        var i = 0, len = list.length, result = new ChunkArray(inst.options.chunks.detachDom), childAry, item;
        while (i < len) {
            item = list[i];
            if (i % size === 0) {
                if (childAry) {
                    childAry.updateHeight(inst.templateModel, _rows);
                }
                childAry = new ChunkArray(inst.options.chunks.detachDom);
                childAry.min = item.min || i;
                childAry.templateModel = inst.templateModel;
                childAry.templateStart = templateStart;
                childAry.templateEnd = templateEnd;
                childAry.parent = result;
                childAry.index = result.length;
                result.push(childAry);
            }
            if (item instanceof ChunkArray) {
                item.parent = childAry;
                item.index = childAry.length;
            }
            childAry.push(item);
            childAry.max = item.max || i;
            i += 1;
        }
        if (childAry) {
            childAry.updateHeight(inst.templateModel, _rows);
        }
        if (!result.min) {
            result.min = result[0] ? result[0].min : 0;
            result.max = result[result.length - 1] ? result[result.length - 1].max : 0;
            result.templateStart = templateStart;
            result.templateEnd = templateEnd;
            result.updateHeight(inst.templateModel, _rows);
            result.dirtyHeight = false;
        }
        return result.length > size ? chunkList(result, size, templateStart, templateEnd) : result;
    }
    /**
     * ###<a name="updateAllChunkHeights">updateAllChunkHeights</a>###
     * Update rows affected by this particular index change. if rowIndex is undefined, update all.
     * @param {Number=} rowIndex
     */
    function updateAllChunkHeights(rowIndex) {
        var indexes, ary;
        if (rowIndex === undefined || inst.options.chunks.detachDom) {
            //TODO: unit test needed.
            // detach dom must enter here, because it is absolute positioned so it will not push down
            // the other chunks automatically like relative positioning will.
            if (_list) {
                _list.forceHeightReCalc(inst.templateModel, _rows);
                _list.updateHeight(inst.templateModel, _rows, 1);
                if (_list.detachDom) {
                    _list.updateDomHeight(1);
                }
            }
        } else {
            indexes = getRowIndexes(rowIndex, _list);
            ary = getArrayFromIndexes(indexes, _list);
            ary.updateHeight(inst.templateModel, _rows, -1, true);
        }
    }
    /**
     * ###<a name="getArrayFromIndexes">getArrayFromIndexes</a>###
     * Look up the chunkArray given an indexes array.
     * @param {Array} indexes
     * @param {ChunkArray} ary
     * @returns {*}
     */
    function getArrayFromIndexes(indexes, ary) {
        var index;
        while (indexes.length) {
            index = indexes.shift();
            if (ary[index] instanceof ChunkArray) {
                ary = ary[index];
            }
        }
        return ary;
    }
    /**
     * Create the chunkList so that it is ready for dom. Set properties needed to create the dom.
     * The dom gets created when the rows are accessed.
     * @param {Array} list // single dimensional array only.
     * @param {Number} size
     * @param {String} templateStart
     * @param {String} templateEnd
     * @param {DomElement} el
     * @returns {DomElement}
     */
    function chunkDom(list, size, templateStart, templateEnd, el) {
        result.log("chunkDom");
        _el = el;
        _chunkSize = size;
        _rows = list;
        _templateStartCache = templateStart;
        _templateEndCache = templateEnd;
        _list = chunkList(list, size, templateStart, templateEnd);
        updateDom(_list);
        _list.updateDomHeight(1);
        return el;
    }
    /**
     * Generate an array of indexes that point to that row.
     * @param rowIndex
     * @param chunkList
     * @param indexes
     * @returns {Array}
     */
    function getRowIndexes(rowIndex, chunkList, indexes) {
        var i = 0, len = chunkList.length, chunk;
        indexes = indexes || [];
        while (i < len) {
            chunk = chunkList[i];
            if (chunk instanceof ChunkArray) {
                if (rowIndex >= chunk.min && rowIndex <= chunk.max) {
                    indexes.push(i);
                    getRowIndexes(rowIndex, chunk, indexes);
                    break;
                }
            } else {
                // we are at the end. So we just need the last index.
                indexes.push(rowIndex % _chunkSize);
                break;
            }
            i += 1;
        }
        return indexes;
    }
    /**
     * Get the dom row element.
     * @param rowIndex {Number}
     * @returns {*}
     */
    function getRow(rowIndex) {
        var indexes = getRowIndexes(rowIndex, _list), el = buildDomByIndexes(indexes);
        if (el && el.length && el.attr("row-id") === undefined) {
            el.attr("row-id", rowIndex);
        }
        return el;
    }
    /**
     * ###<a name="getItemByIndexes">getItemByIndexes</a>###
     * Get the chunk or item given the indexes.
     * @param {Array} indexes
     * @returns {*}
     */
    function getItemByIndexes(indexes) {
        var indxs = indexes.slice(0), ca = _list;
        while (indxs.length) {
            ca = ca[indxs.shift()];
        }
        return ca;
    }
    /**
     * ###<a name="getDomRowByIndexes">getDomRowByIndexes</a>###
     * Get the dom element given the indexes array. This cannot be exposed because public api should use the
     * buildDomByIndexes that is called from getRow.
     * @param {Array} indexes
     * @param {Function} unrendered
     * @returns {*}
     */
    function getDomRowByIndexes(indexes, unrendered) {
        var i = 0, index, indxs = indexes.slice(0), ca = _list, el = _el;
        while (i < indxs.length) {
            index = indxs.shift();
            if (!ca.rendered && unrendered || shouldRecompileDecompiledRows(ca)) {
                unrendered(el, ca);
                updateDom(ca);
            }
            if (!indxs.length) {
                checkAllCompiled(ca);
            }
            ca = ca[index];
            el = ca.rendered || angular.element(el.children()[index]);
        }
        return el;
    }
    function shouldRecompileDecompiledRows(ca) {
        var recompile = !ca.hasChildChunks() && ca.length && ca.rendered && ca.rendered.children().length !== ca.length;
        if (recompile) {
            result.info("recompile chunk %s", ca.getId());
        }
        return recompile;
    }
    /**
     * ###<a name="unrendered">unrendered</a>###
     * How to handle array chunks that have not been rendered yet. They may copy from cache or even create new
     * dom from html strings.
     * @param {JQLite} el
     * @param {ChunkArray} ca
     */
    function unrendered(el, ca) {
        var children, i = 0, iLen;
        el.html(ca.getChildrenStr());
        children = el.children();
        ca.rendered = el;
        if (ca.hasChildChunks()) {
            // assign the dom element.
            iLen = children.length;
            while (i < iLen) {
                ca[i].dom = children[i];
                i += 1;
            }
        }
        if (ca.detachDom && ca.dirtyHeight) {
            ca.updateDomHeight();
        }
        exports.each(children, computeStyles);
        if (ca.hasChildChunks()) {
            if (children[0].className.indexOf(inst.options.chunks.chunkClass) !== -1) {
                // need to calculate css styles before adding this class to make transitions work.
                children.addClass(inst.options.chunks.chunkReadyClass);
            }
        } else if (!ca.rendered.hasClass(inst.options.chunks.chunkReadyClass)) {
            ca.rendered.addClass(inst.options.chunks.chunkReadyClass);
        }
    }
    /**
     * Get the domElement by indexes, create the dom if it doesn't exist.
     * @param {Array} indexes - an array of int values.
     * @returns {*}
     */
    function buildDomByIndexes(indexes) {
        return getDomRowByIndexes(indexes, unrendered);
    }
    /**
     * ##<a name="computedStyles">computedStyles</a>##
     * calculate the computed styles of each element
     */
    function computeStyles(elm) {
        if (elm) {
            var style = window.getComputedStyle(elm);
            if (style) {
                return style.getPropertyValue("top");
            }
        }
    }
    /**
     * ##<a name="checkAllCompiled">checkAllCompiled</a>##
     * Each ChunkArray keeps track of weather or not it's dom has been compiled. Since each
     * ChunkArray generates the values and updates properties of the dom. The dom chunks are a
     * reflection of the ChunkArrays.
     * @param {ChunkArray} ca
     * @returns {Boolean}
     */
    function checkAllCompiled(ca) {
        if (!ca.compiled) {
            ca.compiled = isCompiled(ca);
            if (ca.compiled) {
                if (ca.parent) {
                    // a parent cannot be compiled till it's last child is done. So don't check until
                    // a chunk child compiles.
                    checkAllCompiled(ca.parent);
                }
                inst.flow.add(disableNonVisibleChunks);
            }
        }
        return ca.compiled;
    }
    /**
     * ##<a name="isCompiled">isCompiled</a>##
     * Validate that the chunk is compiled.
     * @param {ChunkArray} ca
     * @returns {boolean}
     */
    function isCompiled(ca) {
        var min, max;
        if (ca[0] instanceof ChunkArray) {
            min = 0;
            max = ca.length;
            while (min < max) {
                if (!ca[min].compiled) {
                    return false;
                }
                min += 1;
            }
            return true;
        }
        min = ca.min;
        max = ca.max;
        while (min < max) {
            if (!inst.isCompiled(min)) {
                return false;
            }
            min += 1;
        }
        return true;
    }
    function updateDom(ca) {
        ca.updateDom(inst.options.chunks.chunkDisabledClass);
    }
    /**
     * ###<a name="reset">reset</a>###
     * Remove all dom, and all other references.
     * @param {Array=} newList
     * @param {JQLite=} content
     * @param {Array=} scopes
     */
    function reset(newList, content, scopes) {
        result.log("reset");
        _cachedDomRows.length = 0;
        newList = newList || [];
        //TODO: this needs to make sure it destroys things properly
        if (_list) {
            _list.destroy();
            _list = null;
            _el = null;
            _rows = null;
        }
        chunkDom(newList, _chunkSize, _templateStartCache, _templateEndCache, content);
    }
    /**
     * ##<a name="disableNonVislbieChunks">disableNonVisibleChunks</a>##
     * disable all chunks that are outside of the values.activeRange.min/max.
     */
    function disableNonVisibleChunks() {
        var r = inst.values.activeRange, o = inst.options.chunks;
        _list.enableRange(r.min, r.max, o.chunkDisabledClass);
        if (o.detachDom) {
            // we need to update which chunks are compiled.
            updateDom(_list);
        }
    }
    /**
     * ###<a name="destroy">destroy</a>###
     * Clean up the chunking and recycling.
     */
    function destroy() {
        reset();
        _list = null;
        _rows = null;
        _chunkSize = null;
        _el = null;
        _templateStartCache = null;
        _templateEndCache = null;
        _cachedDomRows.length = 0;
        _cachedDomRows = null;
        inst.chunkModel = null;
        result.destroyLogger();
        result = null;
        inst = null;
    }
    inst.flow.unique(updateDom);
    result.chunkDom = chunkDom;
    result.getChunkList = getChunkList;
    result.getRowIndexes = function(rowIndex) {
        return getRowIndexes(rowIndex, _list);
    };
    result.getItemByIndexes = getItemByIndexes;
    result.getRow = getRow;
    result.reset = reset;
    result.updateAllChunkHeights = updateAllChunkHeights;
    result.destroy = destroy;
    inst.scope.$on(exports.datagrid.events.ON_AFTER_UPDATE_WATCHERS, disableNonVisibleChunks);
    // apply event dispatching.
    dispatcher(result);
    inst.chunkModel = result;
    return result;
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.chunkModel);

/**
 * ####ChunkArray####
 * is an array with additional properties needed by the chunkModel to generate and access chunks
 * of the dom with high performance.
 * @constructor
 */
function ChunkArray(detachDom) {
    this.uid = ChunkArray.uid++;
    this.enabled = true;
    this.min = 0;
    this.max = 0;
    this.templateStart = "";
    this.templateStartWithPos = "";
    this.templateEnd = "";
    this.parent = null;
    this.mode = detachDom ? ChunkArray.DETACHED : ChunkArray.ATTACHED;
    this.detachDom = detachDom;
    this.index = 0;
}

ChunkArray.uid = 0;

ChunkArray.DETACHED = "chunkArray:detached";

ChunkArray.ATTACHED = "chunkArray:attached";

ChunkArray.prototype = [];

ChunkArray.prototype.getStub = function getStub(str) {
    if (!this.templateStartWithPos) {
        this.createDomTemplates();
    }
    return this.templateStartWithPos + str + this.templateEnd;
};

ChunkArray.prototype.inRange = function(value) {
    return value >= this.min && value <= this.max;
};

ChunkArray.prototype.rangeOverlap = function(min, max, cushion) {
    var overlap = false;
    cushion = cushion > 0 ? cushion : 0;
    min -= cushion;
    max += cushion;
    while (min < max) {
        if (this.inRange(min)) {
            overlap = true;
            break;
        }
        min += 1;
    }
    return overlap;
};

ChunkArray.prototype.each = function(method, args) {
    var i = 0, len = this.length;
    while (i < len) {
        method.apply(this[i], args);
        i += 1;
    }
};

/**
 * #####ChunkArray.prototype.getChildStr#####
 * Get the HTML string representation of the children in this array.
 * If deep then return this and all children down.
 * @param deep
 * @returns {string}
 */
ChunkArray.prototype.getChildrenStr = function(deep) {
    var i = 0, len = this.length, str = "", ca = this;
    while (i < len) {
        if (ca[i] instanceof ChunkArray) {
            str += ca[i].getStub(deep ? ca[i].getChildrenStr(deep) : "");
        } else {
            str += this.templateModel.getTemplate(ca[i]).template;
        }
        i += 1;
    }
    return str;
};

/**
 * #####<a name="updateHeight">updateHeight</a>#####
 * Recalculate the height of this chunk.
 * @param templateModel
 * @param _rows
 */
ChunkArray.prototype.updateHeight = function(templateModel, _rows, recurse, updateDomHeight) {
    var i = 0, len, height = 0;
    if (this[0] instanceof ChunkArray) {
        len = this.length;
        while (i < len) {
            if (recurse === 1) {
                this[i].updateHeight(templateModel, _rows, recurse, updateDomHeight);
            }
            height += this[i].height;
            i += 1;
        }
    } else {
        height = templateModel.getHeight(_rows, this.min, this.max);
    }
    if (this.height !== height) {
        this.dirtyHeight = true;
        this.height = height;
    }
    if (recurse == -1 && this.dirtyHeight && this.parent) {
        this.parent.updateHeight(templateModel, _rows, recurse, updateDomHeight);
    }
    if (updateDomHeight && this.dirtyHeight) {
        this.updateDomHeight();
    }
};

ChunkArray.prototype.getPreviousSibling = function() {
    var prevSibling, prevIndex;
    if (this.parent) {
        prevIndex = this.index - 1;
        prevSibling = this.parent[prevIndex];
        if (!prevSibling || prevSibling.index !== this.index - 1) {
            // we must the first in the array. so we have to jump up higher. Or we are the first item in the first chunk.
            if (this.parent.parent) {
                prevSibling = this.parent.getPreviousSibling();
                if (prevSibling) {
                    prevSibling = prevSibling.last();
                }
            }
        }
    }
    return prevSibling;
};

ChunkArray.prototype.getNextSibling = function() {
    var nextSibling, nextIndex;
    if (this.parent) {
        nextIndex = this.index + 1;
        nextSibling = this.parent[nextIndex];
        if (!nextSibling || nextSibling.index !== this.index + 1) {
            // we must be at the end of the array. So we need to jump up higher. Or we could be at the very end.
            if (this.parent.parent) {
                nextSibling = this.parent.getNextSibling();
                if (nextSibling) {
                    nextSibling = nextSibling.first();
                }
            }
        }
    }
    return nextSibling;
};

ChunkArray.prototype.first = function() {
    return this[0];
};

ChunkArray.prototype.last = function() {
    return this[this.length - 1];
};

/**
 * #####<a name="calculateTop">calculateTop</a>#####
 * Calculate the top value relative to it's parent.
 * @returns {number|top}
 */
ChunkArray.prototype.calculateTop = function() {
    var top = 0, prevSibling;
    if (this.index && this.parent) {
        prevSibling = this.getPreviousSibling();
        if (prevSibling) {
            top = prevSibling.top + prevSibling.height;
        }
    }
    this.top = top;
    return this.top;
};

/**
 * #####<a name="forceHeightReCalc">forceHeightReCal</a>#####
 * Ignore any cached values and update the height of this chunk.
 * @param templateModel
 * @param _rows
 * @returns {number|*|height}
 */
ChunkArray.prototype.forceHeightReCalc = function(templateModel, _rows) {
    var i = 0, len, height = 0;
    if (this[0] instanceof ChunkArray) {
        len = this.length;
        while (i < len) {
            height += this[i].forceHeightReCalc(templateModel, _rows);
            i += 1;
        }
    } else {
        height = templateModel.getHeight(_rows, this.min, this.max);
    }
    if (this.height !== height) {
        this.height = height;
        if (this.detachDom) {
            // we need to update all siblings if we change.
            this.dirtySiblings();
        } else {
            this.setDirtyHeight();
        }
    }
    return this.height;
};

/**
 * #####<a name="setDirtyHeight">setDirtyHeight</a>#####
 * Set this chunk as dirty so heights need calculated.
 */
ChunkArray.prototype.setDirtyHeight = function() {
    var p = this;
    while (p) {
        p.dirtyHeight = true;
        p = p.parent;
    }
};

ChunkArray.prototype.dirtySiblings = function() {
    this.dirtyHeight = true;
    if (this.parent) {
        var i = 0, iLen = this.length;
        while (i < iLen) {
            this[i].dirtyHeight = true;
            i += 1;
        }
        this.parent.dirtySiblings();
    }
};

/**
 * #####<a name="getId">getId</a>#####
 * @returns {string|*|_id}
 */
ChunkArray.prototype.getId = function() {
    if (this._index !== this.index || !this._id) {
        var p = this, s = "";
        this._index = this.index;
        // keep the last index so if it changes. We change the id.
        while (p) {
            s = "." + p.index + s;
            p = p.parent;
        }
        this._id = s.substr(1, s.length);
    }
    return this._id;
};

ChunkArray.prototype.hasChildChunks = function() {
    if (!this._hasChildChunks) {
        this._hasChildChunks = this.first() instanceof ChunkArray;
    }
    return this._hasChildChunks;
};

ChunkArray.prototype.enableRange = function(min, max, disabledClass) {
    if (this.rangeOverlap(min, max, this.detachDom)) {
        this.enable(disabledClass);
    } else {
        this.disable(disabledClass);
    }
    if (this.hasChildChunks()) {
        this.each(this.enableRange, [ min, max, disabledClass ]);
    }
};

ChunkArray.prototype.enable = function(disabledClass) {
    if (!this.enabled) {
        this.enabled = true;
        this.updateDom(disabledClass);
        if (this.parent) {
            this.parent.enable(disabledClass);
        }
    }
};

ChunkArray.prototype.disable = function(disabledClass) {
    var i = 0, len;
    if (this.compiled) {
        if (this.hasChildChunks()) {
            len = this.length;
            while (i < len) {
                this[i].disable(disabledClass);
                i += 1;
            }
        }
        if (this.enabled) {
            this.enabled = false;
            this.updateDom(disabledClass);
        }
    }
};

ChunkArray.prototype.updateDom = function(disabledClass) {
    if (this.rendered) {
        if (this.compiled && !this.rendered.attr("compiled")) {
            this.rendered.attr("compiled", true);
        }
        if (this.detachDom) {
            if (this.enabled) {
                if (this.detached) {
                    this.detached = false;
                    this.parent.rendered.append(this.rendered);
                }
            } else if (!this.enabled && !this.detached) {
                if (this.parent && this.parent.compiled && this.rendered.parent().length) {
                    this.detached = true;
                    //jquery detach is just 2nd param pass true to keep data around.
                    this.rendered.remove(undefined, true);
                }
            }
        } else {
            this.rendered.attr("enabled", this.enabled);
            if (this.enabled) {
                this.rendered.removeAttr("disabled");
                this.rendered.removeAttr("read-only");
                this.rendered.removeClass(disabledClass);
            } else {
                this.rendered.attr("disabled", "disabled");
                this.rendered.attr("read-only", true);
                this.rendered.addClass(disabledClass);
            }
        }
        this.each(this.updateDom, [ disabledClass ]);
    }
};

ChunkArray.prototype.updateDomHeight = function(recursiveDirection) {
    var dom = this.rendered && this.rendered[0] || this.dom;
    if (dom) {
        this.dirtyHeight = false;
        if (this.mode === ChunkArray.DETACHED) {
            this.calculateTop();
            dom.style.top = this.top + "px";
        }
        dom.style.height = this.height + "px";
    } else {
        this.createDomTemplates();
    }
    if (recursiveDirection === -1 && this.parent) {
        this.parent.updateDomHeight(recursiveDirection);
    } else if (recursiveDirection && this.hasChildChunks()) {
        this.each(this.updateDomHeight, [ recursiveDirection ]);
    }
};

ChunkArray.prototype.createDomTemplates = function() {
    if (!this.templateReady && this.templateStart) {
        var str = this.templateStart.substr(0, this.templateStart.length - 1) + ' style="';
        if (this.mode === ChunkArray.DETACHED) {
            this.calculateTop();
            str += "position:absolute;top:" + this.top + "px;left:0px;";
        }
        this.templateStartWithPos = str + "width:100%;height:" + this.height + 'px;" chunk-id="' + this.getId() + '" range="' + this.min + ":" + this.max + '">';
        this.templateReady = true;
    }
};

/**
 * Return an array of the children created from the rendered properties of the children.
 */
ChunkArray.prototype.children = function() {
    var children = [];
    this.each(function() {
        children.push(this.rendered);
    }, []);
};

ChunkArray.prototype.decompile = function(chunkReadyClass) {
    if (this.hasChildChunks()) {
        this.each("decompile", [ chunkReadyClass ]);
    } else {
        // we are going to remove all dom rows to free up memory.
        // this can only be done if the chunk has no rows for children instead of chunks.
        if (this.rendered) {
            this.rendered.children().remove();
            this.rendered.removeClass(chunkReadyClass);
        }
    }
};

/**
 * #####<a name="destroy">destroy</a>#####
 * Perform proper cleanup.
 */
ChunkArray.prototype.destroy = function() {
    if (this.hasChildChunks()) {
        this.each(this.destroy);
    }
    this.templateStart = "";
    this.templateEnd = "";
    this.templateModel = null;
    this.rendered = null;
    this.dom = null;
    this.parent = null;
    while (this.length) {
        this.pop();
    }
    this.length = 0;
};

exports.datagrid.events.ON_RENDER_PROGRESS = "datagrid:onRenderProgress";

exports.datagrid.events.STOP_CREEP = "datagrid:stopCreep";

exports.datagrid.events.ENABLE_CREEP = "datagrid:enableCreep";

exports.datagrid.events.DISABLE_CREEP = "datagrid:disableCreep";

exports.datagrid.coreAddons.creepRenderModel = function creepRenderModel(inst) {
    var intv = 0, creepCount = 0, model = exports.logWrapper("creepModel", {}, "blue", inst.dispatch), upIndex = 0, downIndex = 0, waitHandle, waitingOnReset, time, lastPercent, unwatchers = [];
    function digest(index) {
        var s = inst.getScope(index);
        if (!s || !s.$digested) {
            // just skip if already digested.
            inst.forceRenderScope(index);
        }
    }
    function calculatePercent() {
        var result = {
            count: 0
        };
        each(inst.scopes, calculateScopePercent, result);
        if (result.count >= inst.rowsLength) {
            model.disable();
        }
        return {
            count: result.count,
            len: inst.rowsLength
        };
    }
    function calculateScopePercent(s, index, list, result) {
        result.count += s ? 1 : 0;
    }
    function onInterval(started, ended, force) {
        if (!inst.values.touchDown) {
            waitingOnReset = false;
            time = Date.now() + inst.options.renderThreshold;
            upIndex = started;
            downIndex = ended;
            render(onComplete, force);
        }
    }
    function wait(method, time) {
        var args = exports.util.array.toArray(arguments);
        args.splice(0, 2);
        if (inst.options.async) {
            clearTimeout(waitHandle);
            waitHandle = setTimeout(function() {
                method.apply(null, args);
            }, time);
        } else {
            method.apply(this, args);
        }
        return waitHandle;
    }
    function findUncompiledIndex(index, dir) {
        while (index >= 0 && index < inst.rowsLength && inst.isCompiled(index)) {
            index += dir;
        }
        if (index >= 0 && index < inst.rowsLength) {
            return index;
        }
        return dir > 0 ? inst.rowsLength : -1;
    }
    function render(complete, force) {
        var now = Date.now();
        if (time > now && hasIndexesLeft()) {
            upIndex = force ? upIndex : findUncompiledIndex(upIndex, -1);
            if (upIndex >= 0) {
                digest(upIndex);
                if (force) upIndex -= 1;
            }
            downIndex = force ? downIndex : findUncompiledIndex(downIndex, 1);
            if (downIndex !== inst.rowsLength) {
                digest(downIndex);
                if (force) downIndex += 1;
            }
            render(complete, force);
        } else {
            complete();
        }
    }
    function onComplete() {
        stop();
        if (!hasIndexesLeft()) {
            creepCount = 0;
            model.disable();
            lastPercent = 1;
            inst.dispatch(exports.datagrid.events.ON_RENDER_PROGRESS, 1);
        } else {
            creepCount += 1;
            if (!inst.values.touchDown && !inst.values.speed && hasIndexesLeft()) {
                resetInterval(upIndex, downIndex);
            }
            var percent = calculatePercent();
            if (percent !== lastPercent) {
                inst.dispatch(exports.datagrid.events.ON_RENDER_PROGRESS, percent);
            }
        }
    }
    function hasIndexesLeft() {
        return !!(upIndex > -1 || downIndex < inst.rowsLength);
    }
    function stop() {
        time = 0;
        clearTimeout(intv);
        clearTimeout(waitHandle);
        intv = 0;
    }
    function resetInterval(started, ended, waitTime, forceCompileRowRender) {
        stop();
        if (creepCount < inst.options.creepLimit) {
            intv = wait(onInterval, waitTime || inst.options.renderThresholdWait, started, ended, forceCompileRowRender);
        }
    }
    function renderLater(event, forceCompileRowRender) {
        resetInterval(upIndex, downIndex, inst.options.creepStartDelay, forceCompileRowRender);
    }
    function onBeforeRender(event) {
        stop();
    }
    function onAfterRender(event, loopData, forceCompileRowRender) {
        creepCount = 0;
        upIndex = loopData.started || 0;
        downIndex = loopData.ended || 0;
        renderLater(event, forceCompileRowRender);
    }
    function onBeforeReset(event) {
        onBeforeRender(event);
        if (inst.options.creepRender && inst.options.creepRender.enable !== false) {
            model.enable();
        }
    }
    model.stop = stop;
    // allow external stop of creep render.
    model.destroy = function destroy() {
        model.disable();
        stop();
        inst = null;
        model = null;
    };
    model.enable = function() {
        if (!unwatchers.length) {
            unwatchers.push(inst.scope.$on(exports.datagrid.events.BEFORE_VIRTUAL_SCROLL_START, onBeforeRender));
            unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_VIRTUAL_SCROLL_UPDATE, onBeforeRender));
            unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_TOUCH_DOWN, onBeforeRender));
            unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_SCROLL_START, onBeforeRender));
            unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_UPDATE_WATCHERS, onAfterRender));
        }
    };
    model.disable = function() {
        stop();
        model.info("creep Disabled");
        while (unwatchers.length) {
            unwatchers.pop()();
        }
    };
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.DISABLE_CREEP, model.disable));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_RESET, onBeforeReset));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.STOP_CREEP, stop));
    inst.creepRenderModel = model;
    // do not add listeners if it is not enabled.
    if (inst.options.creepRender && inst.options.creepRender.enable) {
        model.enable();
    } else {
        model.disable();
    }
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.creepRenderModel);

/*global ux */
exports.datagrid.coreAddons.normalizeModel = function normalizeModel(inst) {
    //TODO: this needs to be put on exp.normalizedModel
    var originalData, normalizedData, result = exports.logWrapper("normalizeModel", {}, "grey", inst.dispatch);
    /**
     * ###<a name="normalize">normalize</a>###
     * Convert a hierarchical data structure into a flattened array so that headers, rows, and however deep the data is
     * will all be able to represented by template rows.
     * @param {Array} data
     * @param {String} grouped
     * @param {Array=} normalized
     * @returns {Array}
     */
    inst.normalize = function normalize(data, grouped, normalized) {
        data = data || [];
        var i = 0, len = data.length;
        normalized = normalized || [];
        while (i < len) {
            normalized.push(data[i]);
            if (data[i] && data[i][grouped]) {
                inst.normalize(data[i][grouped], grouped, normalized);
            }
            i += 1;
        }
        return normalized;
    };
    /**
     * ###<a name="setData">setData</a>###
     * Set the data so that it can be normalized.
     * @param {Array} data
     * @param {String} grouped
     * @returns {*}
     */
    inst.setData = function(data, grouped) {
        result.log("setData %s", data);
        originalData = data;
        if (grouped) {
            normalizedData = inst.normalize(data, grouped);
        } else {
            normalizedData = data && data.slice(0) || [];
        }
        return normalizedData;
    };
    /**
     * ###<a name="getData">getData</a>###
     * Get the data the datagrid is using. This is normalized data.
     * @returns {Array}
     */
    inst.getData = function() {
        return normalizedData;
    };
    /**
     * ###<a name="getOriginalData">getOriginalData</a>###
     * Get the data that the normalized data was created from.
     * @returns {Array}
     */
    inst.getOriginalData = function() {
        return originalData;
    };
    /**
     * ##<a name="getOriginalIndexOfItem">getOriginalIndexOfItem</a>##
     * get the index or indexes of the item from the original data that the normalized array was created from.
     */
    inst.getOriginalIndexOfItem = function getOriginalIndexOfItem(item) {
        var indexes = ux.each(originalData, findItem, item, []);
        return indexes && indexes !== originalData ? indexes : [];
    };
    /**
     * ###<a name="findItem">findItem</a>###
     * find the item in the list of items and recursively search the child arrays if they have the grouped property
     * @param {*} item
     * @param {Number} index
     * @param {Array} list
     * @param {*} targetItem
     * @param {Array} indexes
     * @returns {*}
     */
    function findItem(item, index, list, targetItem, indexes) {
        var found;
        indexes = indexes.slice(0);
        indexes.push(index);
        if (item === targetItem) {
            return indexes;
        } else if (item[inst.grouped] && item[inst.grouped].length) {
            found = ux.each(item[inst.grouped], findItem, targetItem, indexes);
            if (found && found !== item[inst.grouped]) {
                return found;
            }
        }
        return undefined;
    }
    /**
     * ###<a name="getNormalizedIndex">getNormalizedIndex</a>###
     * Get the normalized index for an item.
     * @param {*} item
     * @param {Number=} startIndex
     */
    inst.getNormalizedIndex = function getNormalizedIndex(item, startIndex) {
        var i = startIndex || 0;
        while (i < inst.rowsLength) {
            if (inst.data[i] === item) {
                return i;
            }
            i += 1;
        }
        if (startIndex) {
            i = startIndex;
            while (i >= 0) {
                if (inst.data[i] === item) {
                    return i;
                }
                i -= 1;
            }
        }
        return -1;
    };
    /**
     * ###<a name="replace">replace</a>###
     * Replace at the index, the newItem.
     * @param item
     * @param index
     */
    result.replace = function(item, index) {
        // first get the original item index.
        var indexes = inst.getOriginalIndexOfItem(normalizedData[index]), origItem, list = originalData, lastIndex;
        while (indexes.length) {
            lastIndex = indexes.shift();
            origItem = list[lastIndex];
            if (!indexes.length) {
                list[lastIndex] = item;
                break;
            }
            if (inst.grouped) {
                list = origItem[inst.grouped];
            }
        }
        normalizedData[index] = item;
    };
    /**
     * ###<a name="destroy">destroy</a>###
     * Make sure all variables are cleaned up.
     */
    result.destroy = function destroy() {
        result.destroyLogger();
        originalData = null;
        normalizedData = null;
        inst.normalizeModel = null;
        inst = null;
        result = null;
    };
    inst.normalizeModel = result;
    return inst;
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.normalizeModel);

/*global ux */
exports.datagrid.events.ON_SCROLL_START = "datagrid:scrollStart";

exports.datagrid.events.ON_SCROLL_STOP = "datagrid:scrollStop";

exports.datagrid.events.ON_TOUCH_DOWN = "datagrid:touchDown";

exports.datagrid.events.ON_TOUCH_UP = "datagrid:touchUp";

exports.datagrid.events.ON_TOUCH_MOVE = "datagrid:touchMove";

exports.datagrid.coreAddons.scrollModel = function scrollModel(inst) {
    var result = exports.logWrapper("scrollModel", {}, "orange", inst.dispatch), setup = false, unwatchSetup, waitForStopIntv, hasScrollListener = false, lastScroll, bottomOffset = 0, lastRenderTime, // start easing
    startOffsetY, startOffsetX, offsetY, offsetX, startScroll, lastDeltaY, lastDeltaX, speed = 0, startTime, distance, scrollingIntv, // end easing
    listenerData = [ {
        event: "touchstart",
        method: "onTouchStart",
        enabled: true
    }, {
        event: "touchmove",
        method: "onTouchMove",
        enabled: false
    }, {
        event: "touchend",
        method: "onTouchEnd",
        enabled: true
    }, {
        event: "touchcancel",
        method: "onTouchEnd",
        enabled: true
    } ];
    /**
     * Listen for scrollingEvents.
     */
    function setupScrolling() {
        unwatchSetup();
        if (!inst.element.css("overflow") || inst.element.css("overflow") === "visible") {
            inst.element.css({
                overflow: "auto"
            });
        }
        result.log("addScrollListener");
        addScrollListener();
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.SCROLL_TO_INDEX, function(event, index) {
            inst.scrollModel.scrollToIndex(index, true);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.SCROLL_TO_ITEM, function(event, item) {
            inst.scrollModel.scrollToItem(item, true);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.SCROLL_INTO_VIEW, function(event, itemOrIndex) {
            inst.scrollModel.scrollIntoView(itemOrIndex, true);
        }));
        addTouchEvents();
        setup = true;
    }
    function addScrollListener() {
        result.log("addScrollListener");
        hasScrollListener = true;
        inst.element[0].addEventListener("scroll", onUpdateScrollHandler);
    }
    function onBeforeReset() {
        if (inst.options.scrollModel && inst.options.scrollModel.manual) {
            listenerData[1].enabled = true;
        }
        if (hasScrollListener) {
            result.removeScrollListener();
            hasScrollListener = false;
        }
        result.removeTouchEvents();
    }
    function onAfterReset() {
        if (!hasScrollListener) {
            addScrollListener();
        }
        addTouchEvents();
    }
    function addTouchEvents() {
        result.log("addTouchEvents");
        var content = inst.getContent();
        exports.each(listenerData, function(item) {
            if (item.enabled) {
                result.log("	add %s", item.event);
                content.bind(item.event, result[item.method]);
            }
        });
    }
    result.fireOnScroll = function fireOnScroll() {
        if (inst.values.scroll !== lastScroll) {
            lastScroll = inst.values.scroll;
            inst.dispatch(exports.datagrid.events.ON_SCROLL, inst.values);
        }
    };
    result.removeScrollListener = function removeScrollListener() {
        result.log("removeScrollListener");
        inst.element[0].removeEventListener("scroll", onUpdateScrollHandler);
    };
    result.removeTouchEvents = function removeTouchEvents() {
        if (setup) {
            result.log("removeTouchEvents");
            var content = inst.getContent();
            exports.each(listenerData, function(item) {
                result.log("	remove %s", item.event);
                content.unbind(item.event, result[item.method]);
            });
        }
    };
    function getTouches(event) {
        return event.touches || event.originalEvent.touches;
    }
    result.killEvent = function(event) {
        event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    };
    result.onTouchStart = function onTouchStart(event) {
        clearTimeout(scrollingIntv);
        inst.values.touchDown = true;
        offsetY = startOffsetY = getTouches(event)[0].clientY || 0;
        offsetX = startOffsetX = getTouches(event)[0].clientX || 0;
        if (inst.values.scroll < 0) {
            inst.values.scroll = 0;
        } else if (inst.values.scroll > bottomOffset) {
            inst.values.scroll = bottomOffset;
        }
        startScroll = inst.values.scroll;
        lastDeltaY = 0;
        lastDeltaX = 0;
        inst.dispatch(exports.datagrid.events.ON_TOUCH_DOWN, event);
    };
    result.onTouchMove = function(event) {
        result.killEvent(event);
        var y = getTouches(event)[0].clientY, x = getTouches(event)[0].clientX, deltaY = offsetY - y, deltaX = offsetX - x;
        if (deltaY !== lastDeltaY) {
            result.setScroll(result.capScrollValue(startScroll + deltaY));
            speed = deltaY - lastDeltaY;
            lastDeltaY = deltaY;
            lastDeltaX = deltaX;
        }
        inst.dispatch(exports.datagrid.events.ON_TOUCH_MOVE, speed, deltaY, lastDeltaY);
    };
    result.onTouchEnd = function onTouchEnd(event) {
        inst.values.touchDown = false;
        inst.dispatch(exports.datagrid.events.ON_TOUCH_UP, event);
        if (listenerData[1].enabled) {
            if (Math.abs(lastDeltaY) < 2 && Math.abs(lastDeltaX) < 2) {
                result.click(event);
            } else {
                startTime = Date.now();
                distance = speed * inst.options.scrollModel.speed;
                result.scrollSlowDown(true);
            }
        }
        var sTop = inst.element[0].scrollTop;
        if (sTop < 0 || inst.getContentHeight() < inst.getViewportHeight()) {
            inst.element[0].scrollTop = 0;
        } else if (sTop > inst.getContentHeight() - inst.getViewportHeight()) {
            inst.element[0].scrollTop = inst.getContentHeight() - inst.getViewportHeight();
        }
    };
    result.scrollSlowDown = function(wait) {
        clearTimeout(scrollingIntv);
        var value, duration = Math.abs(speed) * inst.options.scrollModel.speed, t = duration - (Date.now() - startTime), prevDistance = distance, change;
        distance = result.easeOut(t, distance, speed || 0, duration);
        change = distance - prevDistance;
        if (Math.abs(change) < 5) {
            t = 0;
        }
        if (t > 0) {
            value = result.capScrollValue(inst.values.scroll + change);
            if (!wait) {
                //                result.log("\tscroll %s of %s", value, inst.element[0].scrollHeight);
                inst.element[0].scrollTop = value;
            }
            scrollingIntv = setTimeout(result.scrollSlowDown, 20);
        }
    };
    result.easeOut = function easeOutQuad(t, b, c, d) {
        return -c * (t /= d) * (t - 2) + b;
    };
    result.click = function(e) {
        // simulate click on android. Ignore on IOS.
        if (!exports.datagrid.isIOS || inst.options.scrollModel.simulateClick) {
            if (inst.options.scrollModel.simulateClick) {
                result.killEvent(e);
            }
            var target = e.target, ev;
            if (!/(SELECT|INPUT|TEXTAREA)/i.test(target.tagName)) {
                ev = document.createEvent("MouseEvents");
                ev.initMouseEvent("click", true, true, e.view, 1, target.screenX, target.screenY, target.clientX, target.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, 0, null);
                ev._constructed = true;
                target.dispatchEvent(ev);
            }
        }
    };
    result.getScroll = function getScroll(el) {
        return (el || inst.element[0]).scrollTop;
    };
    result.setScroll = function setScroll(value) {
        var unwatch, chunkList = inst.chunkModel.getChunkList();
        if (!chunkList || !chunkList.height) {
            // wait until that height is ready then scroll.
            unwatch = inst.scope.$on(exports.datagrid.events.ON_AFTER_RENDER, function() {
                unwatch();
                result.setScroll(value);
            });
        } else if (inst.getContentHeight() - inst.getViewportHeight() >= value) {
            inst.element[0].scrollTop = value;
        }
        inst.values.scroll = value;
    };
    function onUpdateScrollHandler(event) {
        inst.scrollModel.onUpdateScroll(event);
    }
    /**
     * When a scrollEvent is fired, recalculate the values.
     * @param event
     */
    result.onUpdateScroll = function onUpdateScroll(event) {
        var val = inst.scrollModel.getScroll(event.target || event.srcElement);
        if (inst.values.scroll !== val) {
            inst.dispatch(exports.datagrid.events.ON_SCROLL_START, val);
            inst.values.speed = val - inst.values.scroll;
            inst.values.absSpeed = Math.abs(inst.values.speed);
            inst.values.scroll = val;
            inst.values.scrollPercent = (inst.values.scroll / inst.getContentHeight() * 100).toFixed(2);
        }
        inst.scrollModel.waitForStop();
        result.fireOnScroll();
    };
    result.capScrollValue = function(value) {
        var newVal;
        if (inst.getContentHeight() < inst.getViewportHeight()) {
            inst.log("	CAPPED scroll value from %s to 0", value);
            value = 0;
        } else if (inst.getContentHeight() - value < inst.getViewportHeight()) {
            // don't allow to scroll past the bottom.
            newVal = inst.getContentHeight() - inst.getViewportHeight();
            // this will be the bottom scroll.
            inst.log("	CAPPED scroll value to keep it from scrolling past the bottom. changed %s to %s", value, newVal);
            value = newVal;
        }
        return value;
    };
    /**
     * Scroll to the numeric value.
     * @param value
     * @param {Boolean=} immediately
     */
    result.scrollTo = function scrollTo(value, immediately) {
        value = result.capScrollValue(value);
        inst.scrollModel.setScroll(value);
        if (immediately) {
            inst.scrollModel.onScrollingStop();
        } else {
            inst.scrollModel.waitForStop();
        }
    };
    result.clearOnScrollingStop = function clearOnScrollingStop() {
        result.onScrollingStop();
    };
    function flowWaitForStop() {
        lastRenderTime = Date.now();
        inst.scrollModel.onScrollingStop();
    }
    /**
     * Wait for the datagrid to slow down enough to render.
     */
    result.waitForStop = function waitForStop() {
        var forceRender = false;
        clearTimeout(waitForStopIntv);
        result.log("waitForStop scroll = %s", inst.values.scroll);
        if (inst.options.renderWhileScrolling) {
            if (Date.now() - (inst.options.renderWhileScrolling > 0 || 0) > lastRenderTime) {
                forceRender = true;
            }
        }
        if (!forceRender && (inst.flow.async || inst.values.touchDown)) {
            waitForStopIntv = setTimeout(flowWaitForStop, inst.options.updateDelay);
        } else {
            flowWaitForStop();
        }
    };
    /**
     * When it stops render.
     */
    result.onScrollingStop = function onScrollingStop() {
        result.log("onScrollingStop %s", inst.values.scroll);
        result.checkForEnds();
        inst.values.speed = 0;
        inst.values.absSpeed = 0;
        inst.render();
        result.fireOnScroll();
        inst.dispatch(exports.datagrid.events.ON_SCROLL_STOP, inst.values);
        result.calculateBottomOffset();
    };
    /**
     * Scroll to the normalized index.
     * @param index
     * @param {Boolean=} immediately
     */
    result.scrollToIndex = function scrollToIndex(index, immediately) {
        result.log("scrollToIndex");
        var offset = inst.getRowOffset(index);
        inst.scrollModel.scrollTo(offset, immediately);
        return offset;
    };
    /**
     * Scroll to an item by finding it's normalized index.
     * @param item
     * @param {Boolean=} immediately
     */
    result.scrollToItem = function scrollToItem(item, immediately) {
        result.log("scrollToItem");
        var index = inst.getNormalizedIndex(item);
        if (index !== -1) {
            return inst.scrollModel.scrollToIndex(index, immediately);
        }
        return inst.values.scroll;
    };
    /**
     * If the item is above or below the viewable area, scroll till it is in view.
     * @param itemOrIndex
     * @param immediately
     */
    result.scrollIntoView = function scrollIntoView(itemOrIndex, immediately) {
        result.log("scrollIntoView");
        var index = typeof itemOrIndex === "number" ? itemOrIndex : inst.getNormalizedIndex(itemOrIndex), offset = inst.getRowOffset(index), rowHeight, viewHeight;
        compileRowSiblings(index);
        if (offset < inst.values.scroll) {
            // it is above the view.
            inst.scrollModel.scrollTo(offset, immediately);
            return;
        }
        inst.updateViewportHeight();
        // always update the height before calculating. onResize is not reliable
        viewHeight = inst.getViewportHeight();
        rowHeight = inst.templateModel.getTemplateHeight(inst.getData()[index]);
        if (offset >= inst.values.scroll + viewHeight - rowHeight) {
            // it is below the view.
            inst.scrollModel.scrollTo(offset - viewHeight + rowHeight, immediately);
        }
    };
    function compileRowSiblings(index) {
        if (inst.data[index - 1] && !inst.isCompiled(index - 1)) {
            inst.forceRenderScope(index - 1);
        }
        if (inst.data[index + 1] && !inst.isCompiled(index + 1)) {
            inst.forceRenderScope(index + 1);
        }
    }
    function onAfterHeightsUpdated() {
        if (hasScrollListener) {
            result.log("onAfterHeightsUpdated force scroll to %s", inst.values.scroll);
            inst.element[0].scrollTop = inst.values.scroll;
        }
    }
    /**
     * Scroll to top.
     * @param immediately
     */
    result.scrollToTop = function(immediately) {
        result.log("scrollToTop");
        inst.scrollModel.scrollTo(0, immediately);
    };
    /**
     * Scroll to bottom.
     * @param immediately
     */
    result.scrollToBottom = function(immediately) {
        result.log("scrollToBottom");
        var value = inst.getContentHeight() - inst.getViewportHeight();
        inst.scrollModel.scrollTo(value >= 0 ? value : 0, immediately);
    };
    /**
     * ###<a name="calculateBottomOffset">calculateBottomOffset</a>###
     * calculate the scroll value for when the grid is scrolled to the bottom.
     */
    result.calculateBottomOffset = function() {
        if (inst.rowsLength) {
            var i = inst.rowsLength - 1;
            result.bottomOffset = bottomOffset = inst.getRowOffset(i) - inst.getViewportHeight() + inst.getRowHeight(i);
        }
    };
    /**
     * ###<a name="onUpdateScroll">onUpdateScroll</a>###
     * When the scroll value updates. Determine if we are at the top or the bottom and dispatch if so.
     */
    result.checkForEnds = function() {
        if (inst.values.scroll && inst.values.scroll >= bottomOffset) {
            inst.dispatch(ux.datagrid.events.ON_SCROLL_TO_BOTTOM, inst.values.speed);
        } else if (inst.values.scroll <= 0) {
            inst.dispatch(ux.datagrid.events.ON_SCROLL_TO_TOP, inst.values.speed);
        }
    };
    function destroy() {
        clearTimeout(waitForStopIntv);
        result.destroyLogger();
        unwatchSetup();
        if (setup) {
            result.removeScrollListener();
            result.removeTouchEvents();
        }
        result = null;
        inst = null;
    }
    /**
     * Wait till the grid is ready before we setup our listeners.
     */
    unwatchSetup = inst.scope.$on(exports.datagrid.events.ON_READY, setupScrolling);
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_HEIGHTS_UPDATED, onAfterHeightsUpdated));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_RESET, onBeforeReset));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_RESET, onAfterReset));
    inst.unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_RENDER_AFTER_DATA_CHANGE, result.calculateBottomOffset));
    result.destroy = destroy;
    inst.scrollModel = result;
    // all models should try not to pollute the main model to keep it clean.
    return inst;
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.scrollModel);

/*global angular */
/**
 * ##<a name="templateModel">templateModel</a>##
 * Management of templates for the datagrid.
 * @param inst
 * @returns {templateModel|*|Function|templateModel|templateModel}
 */
exports.datagrid.coreAddons.templateModel = function templateModel(inst) {
    "use strict";
    function trim(str) {
        // remove newline / carriage return
        str = str.replace(/\n/g, "");
        // remove whitespace (space and tabs) before tags
        str = str.replace(/[\t ]+</g, "<");
        // remove whitespace between tags
        str = str.replace(/>[\t ]+</g, "><");
        // remove whitespace after tags
        str = str.replace(/>[\t ]+$/g, ">");
        return str;
    }
    inst.templateModel = function() {
        var templates = [], totalHeight, defaultName = "default", result = exports.logWrapper("templateModel", {}, "teal", inst.dispatch), forcedTemplates = [], templatesKey;
        function getTemplatesKey() {
            if (!templatesKey) {
                templatesKey = "$$template_" + inst.uid;
            }
            return templatesKey;
        }
        function createTemplates() {
            result.log("createTemplates");
            var i, scriptTemplates = inst.element[0].getElementsByTagName("script"), len = scriptTemplates.length;
            if (!len && !templates.length) {
                throw new Error(exports.errors.E1102);
            }
            for (i = 0; i < len; i += 1) {
                createTemplateFromScriptTemplate(scriptTemplates[i]);
            }
            // remove the script templates.
            while (scriptTemplates.length) {
                inst.element[0].removeChild(scriptTemplates[0]);
            }
        }
        function createTemplateFromScriptTemplate(scriptTemplate) {
            var name = getScriptTemplateAttribute(scriptTemplate, "template-name") || defaultName, base = getScriptTemplateAttribute(scriptTemplate, "template-base") || null, itemName = getScriptTemplateAttribute(scriptTemplate, "template-item");
            return createTemplate(trim(angular.element(scriptTemplate).html()), name, itemName, base);
        }
        function createTemplatesFromData(templateData) {
            exports.each(templateData, function(tpl) {
                createTemplate(tpl.template, tpl.name, tpl.item, tpl.base);
            });
        }
        function createTemplate(template, name, itemName, base) {
            var originalTemplate = template, wrapper = document.createElement("div"), templateData;
            wrapper.className = "grid-template-wrapper";
            template = result.prepTemplate(name, template, base);
            template = angular.element(template)[0];
            if (!base) {
                template.className += " " + inst.options.rowClass + " " + inst.options.uncompiledClass + " {{$status}}";
            }
            template.setAttribute("template", name);
            inst.getContent()[0].appendChild(wrapper);
            wrapper.appendChild(template);
            template = trim(wrapper.innerHTML);
            templateData = {
                name: name,
                item: itemName,
                template: template,
                originalTemplate: originalTemplate,
                height: wrapper.offsetHeight
            };
            result.log("template: %s %o", name, templateData);
            if (!templateData.height) {
                if (inst.element.css("display") === "none") {
                    result.warn("Datagrid was intialized with a display:'none' value. Templates are unable to calculate heights. Grid will not render correctly.");
                } else if (!inst.element[0].offsetHeight) {
                    throw new Error(exports.errors.E1000);
                } else {
                    throw new Error(exports.errors.E1101);
                }
            }
            templates[templateData.name] = templateData;
            templates.push(templateData);
            inst.getContent()[0].removeChild(wrapper);
            totalHeight = 0;
            // reset cached value.
            return templateData;
        }
        function prepTemplate(name, templateStr, base) {
            var str = "", baseTemplate;
            if (base) {
                baseTemplate = result.getTemplateByName(base);
                str = baseTemplate.originalTemplate;
                str = str.replace(new RegExp("#{3}" + name + "#{3}", "gi"), templateStr);
                return str;
            }
            return templateStr.replace(/\#{3}[\w\d\W]+\#{3}/, "");
        }
        function getScriptTemplateAttribute(scriptTemplate, attrStr) {
            var node = scriptTemplate.attributes["data-" + attrStr] || scriptTemplate.attributes[attrStr];
            return node && node.value || "";
        }
        function getTemplates() {
            return templates;
        }
        /**
         * ###<a name="getTemplate">getTemplate</a>###
         * Use the data object from each item in the array to determine the template for that item.
         * @param data
         */
        result.getTemplate = function getTemplate(data) {
            var tpl = data[getTemplatesKey()] || data._template;
            return result.getTemplateByName(tpl);
        };
        //TODO: need to make this method so it can be overwritten to look up templates a different way.
        function getTemplateName(el) {
            return el.attr ? el.attr("template") : el.getAttribute("template");
        }
        function getTemplateByName(name) {
            if (templates[name]) {
                return templates[name];
            }
            return templates[defaultName];
        }
        function dynamicHeights() {
            var i, h;
            for (i in templates) {
                if (Object.prototype.hasOwnProperty.apply(templates, [ i ])) {
                    h = h || templates[i].height;
                    if (h !== templates[i].height) {
                        return true;
                    }
                }
            }
            return false;
        }
        function averageTemplateHeight() {
            var i = 0, len = templates.length;
            if (!totalHeight) {
                while (i < len) {
                    totalHeight += templates[i].height;
                    i += 1;
                }
            }
            return totalHeight / len;
        }
        function countTemplates() {
            return templates.length;
        }
        function getTemplateHeight(item) {
            var tpl = result.getTemplate(item);
            return tpl ? tpl.height : 0;
        }
        function getHeight(list, startRowIndex, endRowIndex) {
            var i = startRowIndex, height = 0;
            if (!list.length) {
                return 0;
            }
            while (i <= endRowIndex) {
                height += result.getTemplateHeight(list[i]);
                i += 1;
            }
            return height;
        }
        function setTemplateName(item, templateName) {
            var key = getTemplatesKey();
            if (!Object.prototype.hasOwnProperty.apply(item, [ key ]) && forcedTemplates.indexOf(item) === -1) {
                forcedTemplates.push(item);
            }
            item[key] = templateName;
        }
        function setTemplate(itemOrIndex, newTemplateName, classes) {
            result.log("setTemplate %s %s", itemOrIndex, newTemplateName);
            var item = typeof itemOrIndex === "number" ? inst.data[itemOrIndex] : itemOrIndex;
            var oldTemplate = result.getTemplate(item).name;
            result.setTemplateName(item, newTemplateName);
            inst.dispatch(exports.datagrid.events.ON_ROW_TEMPLATE_CHANGE, item, oldTemplate, newTemplateName, classes);
        }
        function updateTemplateHeights() {
            //TODO: needs unit tested.
            var i = inst.values.activeRange.min, len = inst.values.activeRange.max - i, row, tpl, rowHeight, changed = false, heightCache = {};
            while (i < len) {
                tpl = result.getTemplate(inst.getData()[i]);
                if (!heightCache[tpl.name]) {
                    row = inst.getRowElm(i);
                    rowHeight = row[0].offsetHeight;
                    if (rowHeight !== tpl.height) {
                        tpl.height = rowHeight;
                        changed = true;
                    }
                }
                i += 1;
            }
            if (changed) {
                inst.updateHeights();
            }
        }
        function clearTemplate(item) {
            delete item[getTemplatesKey()];
        }
        function destroy() {
            exports.each(forcedTemplates, clearTemplate);
            forcedTemplates.length = 0;
            result.destroyLogger();
            result = null;
            templates.length = 0;
            templates = null;
            forcedTemplates = null;
        }
        result.defaultName = defaultName;
        result.prepTemplate = prepTemplate;
        result.createTemplates = createTemplates;
        result.createTemplatesFromData = createTemplatesFromData;
        result.getTemplates = getTemplates;
        result.getTemplateName = getTemplateName;
        result.getTemplateByName = getTemplateByName;
        result.templateCount = countTemplates;
        result.dynamicHeights = dynamicHeights;
        result.averageTemplateHeight = averageTemplateHeight;
        result.getHeight = getHeight;
        result.getTemplateHeight = getTemplateHeight;
        result.setTemplate = setTemplate;
        result.setTemplateName = setTemplateName;
        result.updateTemplateHeights = updateTemplateHeights;
        result.getTemplatesKey = getTemplatesKey;
        result.destroy = destroy;
        return result;
    }();
    return inst.templateModel;
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.templateModel);
}(this.ux = this.ux || {}, function() {return this;}()));
