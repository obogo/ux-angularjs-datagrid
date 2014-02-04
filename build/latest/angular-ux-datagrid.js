/*
* uxDatagrid v.0.3.0-alpha
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
/**
 * ## Configs ##
 * ux.datagrid is a highly performant scrolling list for desktop and mobile devices that leverages
 * the browsers ability to gpu cache the dom structure with fast startup times and optimized rendering
 * that allows the gpu to maintain its snapshots as long as possible.
 *
 * Create the default module of ux if it doesn't already exist.
 */
var module;

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
     * ###<a name="isIOS">isIOS</a>###
     * iOS does not natively support smooth scrolling without a css attribute. `-webkit-overflow-scrolling: touch`
     * however with this attribute iOS would crash if you try to change the scroll with javascript, or turn it on and off.
     * So a [virtualScroll](#virtualScroll) was implemented for iOS to make it scroll using translate3d.
     */
    isIOS: navigator.userAgent.match(/(iPad|iPhone|iPod)/g),
    /**
     * ###<a name="states">states</a>###
     *  - **<a name="states.BUILDING">BUILDING</a>**: is the startup phase of the grid before it is ready to perform the first render. This may include
     * waiting for the dom heights be available.
     *  - **<a name="states.ON_READY">ON_READY</a>**: this means that the grid is ready for rendering.
     */
    states: {
        BUILDING: "datagrid:building",
        ON_READY: "datagrid:ready"
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
        updateDelay: 500,
        // - **<a name="creepStartDelay">creepStartDelay</a>**
        // when the creep render starts. How long after the scrolling has stopped.
        creepStartDelay: 2e3,
        // - **<a name="options.cushion">cushion</a>** this it used by the updateRowWatchers and what rows it will update. It can be handy for debugging to make sure only
        // the correct rows are digesting by making the value positive it will take off space from the top and bottom of the viewport that number of pixels to match what
        // rows are activated and which ones are not. Also a negative number will cause the grid to render past the viewable area and digest rows that are out of view.
        // In short it is a debugging cushion about what is activated to see them working.
        cushion: -50,
        // - **<a name="options.chunkSize">chunkSize</a>** this is used to determine how large each chunk should be. Chunks are made recursively
        // so if you pass 8 items and they are chunked at 2 then you would have 2 chunks each with 2 chunks each with 2 rows.
        chunkSize: 50,
        // - **<a name="options.uncompiledClass">uncompiledClass</a>** before a dom row is rendered it is compiled. The compiled row will have {{}} still in the code
        // because the row has not been digested yet. If the user scrolls they can see this. So the uncompiledClass is used to allow the css to hide rows that are not
        // yet compiled. Once they are compiled and digested the uncompiledClass will be removed from that dom row.
        uncompiledClass: "uncompiled",
        // - **<a name="options.renderThreshold">renderThreshold</a>** this value is used by the creepRenderModel to allow the render to process for this amount of ms in
        // both directions from the current visible area and then it will wait and process again as many rows as it can in this timeframe.
        renderThreshold: 1,
        // - **<a name="options.renderThresholdWait">renderThresholdWait</a>** used in conjunction with options.renderThreshold this will wait this amount of time before
        // trying to render more rows.
        renderThresholdWait: 100,
        // - **<a name="options.creepLimit">creepLimit</a>** used with options.renderThreshold and options.renderThresholdWait this will give a maximum amount of renders
        // that can be done before the creep render is turned off.
        creepLimit: 100,
        // - **<a name="options.chunkClass">chunkClass</a>** the class assigned to each chunk in the datagrid. This can be customized on a per grid basis since options
        // can be overridden so that styles or selection may differ from one grid to the next.
        chunkClass: "ux-datagrid-chunk"
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
            if (typeof result === "function") {
                // It is expected that each addon be a function. inst is the instance that is injected.
                addon = $injector.invoke(result, instance, {
                    inst: instance
                });
            } else {
                // they must have returned a null? what was the point. Throw an error.
                throw new Error("Addons expect a function to pass the grid instance to.");
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
        setCSSValue: setCSSValue
    };
}();

/**
 * ##ux.each##
 * Like angular.forEach except that you can pass additional arguments to it that will be available
 * in the iteration function. It is optimized to use while loops where possible instead of for loops for speed.
 * Like Lo-Dash.
 * @param {Array\Object} list
 * @param {Function} method
 * @param {..rest} data _additional arguments passes are available in the iteration function_
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
    } else {
        for (i in list) {
            if (list.hasOwnProperty(i)) {
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
            if (list.hasOwnProperty(i)) {
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
 *
 * @param {Object} target - the object to apply the methods to.
 * @param {Object} scope - the object that the methods will be applied from
 * @param {object} map - custom names of what methods to map from scope. such as _$emit_ and _$broadcast_.
 */
function dispatcher(target, scope, map) {
    var listeners = {};
    /**
     * **off** removeEventListener from this object instance. given the event listened for and the callback reference.
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
     * **on** addEventListener to this object instance.
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
     * **fire** fire the callback with arguments.
     * @param {Function} callback
     * @param {Array} args
     * @returns {*}
     */
    function fire(callback, args) {
        return callback && callback.apply(target, args);
    }
    /**
     * **dispatch** fire the event and any arguments that are passed.
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
    /**
     * **Dispatcher API**
     * - on: add event listener
     * - off: remove event listener
     * - dispatch: fire event.
     */
    if (scope && map) {
        target.on = scope[map.on] && scope[map.on].bind(scope);
        target.off = scope[map.off] && scope[map.off].bind(scope);
        target.dispatch = scope[map.dispatch].bind(scope);
    } else {
        target.on = on;
        target.off = off;
        target.dispatch = dispatch;
    }
}

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
            if (obj.hasOwnProperty(i)) {
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
    inst.async = inst.hasOwnProperty("async") ? inst.async : true;
    inst.debug = inst.hasOwnProperty("debug") ? inst.debug : 0;
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
    var inst = {};
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
        inst.forceRenderScope = forceRenderScope;
        inst.dispatch = dispatch;
        inst.render = function() {
            flow.add(render);
        };
        inst.updateHeights = updateHeights;
        inst.getOffsetIndex = getOffsetIndex;
        inst.isActive = isActive;
        inst.isCompiled = isCompiled;
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
        inst.upateViewportHeight = updateViewportHeight;
        inst.calculateViewportHeight = calculateViewportHeight;
        inst.options = options = angular.extend({}, exports.datagrid.options, scope.$eval(attr.options) || {});
        inst.flow = flow = new Flow({
            async: options.hasOwnProperty("async") ? !!options.async : true,
            debug: options.hasOwnProperty("debug") ? options.debug : 0
        }, inst.dispatch);
        flow.add(init);
        // initialize core.
        flow.run();
    }
    /**
     * ###<a name="createContent">createConent</a>###
     * The [content](#content) dom element is the only direct child created by the datagrid.
     * It is used so append all of the `chunks` so that the it can be scrolled.
     * If the dom element is provided with the class [content](#content) then that dom element will be used
     * allowing the user to add custom classes directly tot he [content](#content) dom element.
     */
    function createContent() {
        var contents = element[0].getElementsByClassName("content"), cnt, classes = "content";
        contents = exports.filter(contents, filterOldContent);
        cnt = contents[0];
        if (cnt) {
            // if there is an old one. Pull the classes from it.
            classes = cnt.className || "content";
        }
        if (!cnt) {
            cnt = angular.element('<div class="' + classes + '"></div>');
            element.append(cnt);
        }
        if (!cnt[0]) {
            cnt = angular.element(cnt);
        }
        return cnt;
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
        return angular.element(cnt).hasClass("old-content") ? false : true;
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
            flow.add(dispatch, [ exports.datagrid.events.ON_STARTUP_COMPLETE ]);
        });
        window.addEventListener("resize", onResize);
        unwatchers.push(scope.$on(exports.datagrid.events.UPDATE, update));
        unwatchers.push(scope.$on(exports.datagrid.events.ON_ROW_TEMPLATE_CHANGE, onRowTemplateChange));
        unwatchers.push(scope.$on("$destroy", destroy));
        flow.add(setupChangeWatcher, [], 0);
        inst.dispatch(exports.datagrid.events.ON_LISTENERS_READY);
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
            flow.add(render);
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
        dispatch(exports.datagrid.events.RESIZE, {
            event: event
        });
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
            var s = el.scope ? el.scope() : angular.element(el).scope();
            // make sure we get the right scope to grab the index from. We need to get it from a row.
            while (s && s.$parent !== inst.scope) {
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
        return inst.chunkModel.getChunkList().height;
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
        content = createContent();
        // this async is important because it allows the updateRowWatchers on first digest to escape the current digest.
        flow.insert(inst.chunkModel.chunkDom, [ list, options.chunkSize, '<div class="' + options.chunkClass + '">', "</div>", content ], 0);
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
            s.$status = "compiled";
            s[tpl.item] = inst.data[index];
            // set the data to the scope.
            s.$index = index;
            scopes[index] = s;
            el = getRowElm(index);
            el.removeClass(options.uncompiledClass);
            $compile(el)(s);
            deactivateScope(s);
        }
        return s;
    }
    /**
     * ###<a name="buildRows">buildRows</a>###
     * Set the state to <a name="states.BUILDING">states.BUILDING</a>. Then build the dom.
     * @param {Array} list
     */
    function buildRows(list) {
        inst.log("	buildRows %s", list.length);
        state = states.BUILDING;
        flow.insert(createDom, [ list ], 0);
    }
    /**
     * ###<a name="ready">ready</a>###
     * Set the state to <a href="states.ON_READY">states.ON_READY</a> and start the first render.
     */
    function ready() {
        inst.log("	ready");
        state = states.ON_READY;
        flow.add(render);
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
        if (!s.$$phase) {
            s.$digest();
        }
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
                if (listenerCounts.hasOwnProperty(eventName)) {
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
        //console.log("%c%s.$$listenerCount[%s] %s - %s = %s", "color:#FF6600", s.$id, eventName, s.$$listenerCount[eventName], listenerCounts[eventName], s.$$listenerCount[eventName] - listenerCounts[eventName]);
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
            s.$$$watchers = s.$$watchers;
            s.$$watchers = [];
            if (!depth) {
                // only do this on the first depth so we do not recursively reset counts.
                s.$$$listenerCount = s.$$listenerCount;
                s.$$listenerCount = angular.copy(s.$$$listenerCount);
                subtractEvents(s, s.$$$listenerCount);
            }
            // recursively go through children and deactivate them.
            if (s.$$childHead) {
                child = s.$$childHead;
                while (child) {
                    deactivateScope(child, depth + 1);
                    child = child.$$nextSibling;
                }
            }
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
            if (s.$$childHead) {
                child = s.$$childHead;
                while (child) {
                    activateScope(child, depth + 1);
                    child = child.$$nextSibling;
                }
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
        var est = Math.floor(offset / inst.templateModel.averageTemplateHeight()), i = 0;
        if (rowOffsets[est] && rowOffsets[est] <= offset) {
            i = est;
        }
        while (i < inst.rowsLength) {
            if (rowOffsets[i] > offset) {
                return i - 1;
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
        var height = viewHeight, result = {
            startIndex: 0,
            i: 0,
            inc: 1,
            end: inst.rowsLength,
            visibleScrollStart: values.scroll + options.cushion,
            visibleScrollEnd: values.scroll + height - options.cushion
        };
        result.startIndex = result.i = getOffsetIndex(values.scroll);
        return result;
    }
    /**
     * ###<a name="updateHeightValues">updateHeightValues</a>###
     * invalidate and update all height values of the chunks and rows.
     */
    function updateHeightValues() {
        //TODO: this is going to be updated to use ChunkArray data to be faster.
        var height = 0, i = 0;
        while (i < inst.rowsLength) {
            rowOffsets[i] = height;
            height += inst.templateModel.getTemplateHeight(inst.data[i]);
            i += 1;
        }
        options.rowHeight = inst.rowsLength ? inst.templateModel.getTemplateHeight("default") : 0;
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
        inst.log("	visibleScrollStart %s visibleScrollEnd %s", loop.visibleScrollStart, loop.visibleScrollEnd);
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
                    lastActiveIndex = lastActive.indexOf(loop.i);
                    if (lastActiveIndex !== -1) {
                        lastActive.splice(lastActiveIndex, 1);
                    }
                    // make sure to put them into active in the right order.
                    active.push(loop.i);
                    safeDigest(s);
                }
            }
            loop.i += loop.inc;
            // optimize the loop
            if (loop.inc > 0 && offset > loop.visibleScrollEnd || loop.inc < 0 && offset < loop.visibleScrollStart) {
                break;
            }
        }
        loop.ended = loop.i - 1;
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
            var lastIndex = active[active.length - 1], i = 0, len = active.length;
            scope.$$childHead = scopes[active[0]];
            scope.$$childTail = scopes[lastIndex];
            while (i < len) {
                scopes[active[i]].$$prevSibling = scopes[active[i - 1]];
                scopes[active[i]].$$nextSibling = scopes[active[i + 1]];
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
        if (values.dirty) {
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
            inst.upateViewportHeight();
            waitCount += 1;
            if (waitCount < 2) {
                inst.info("datagrid is waiting for element to have a height.");
                flow.add(render, null, 0);
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
                if (flow.length()) {
                    flow.insert(ready);
                    flow.insert(updateHeightValues);
                    flow.insert(buildRows, [ inst.data ], 0);
                } else {
                    flow.add(buildRows, [ inst.data ], 0);
                    flow.add(updateHeightValues);
                    flow.add(ready);
                }
            } else if (state === states.ON_READY) {
                inst.dispatch(exports.datagrid.events.ON_BEFORE_RENDER);
                flow.add(beforeRenderAfterDataChange);
                flow.add(updateRowWatchers);
                flow.add(afterRenderAfterDataChange);
                flow.add(destroyOldContent);
                flow.add(inst.dispatch, [ exports.datagrid.events.ON_AFTER_RENDER ]);
            } else {
                throw new Error("RENDER STATE INVALID");
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
     * ###<a name="onDataChanged">onDataChanged</a>###
     * when the data changes. It is compared by reference, not value for speed
     * (this is the default angular setting).
     */
    function onDataChanged(newVal, oldVal) {
        var evt = dispatch(exports.datagrid.events.ON_BEFORE_DATA_CHANGE, newVal, oldVal);
        if (evt.defaultPrevented && evt.newValue) {
            newVal = evt.newValue;
        }
        values.dirty = true;
        inst.log("dataChanged");
        inst.grouped = scope.$eval(attr.grouped);
        inst.data = inst.setData(newVal || attr.list, inst.grouped) || [];
        dispatch(exports.datagrid.events.ON_AFTER_DATA_CHANGE, inst.data, oldVal);
        reset();
    }
    /**
     * ###<a name="reset">reset</a>###
     * clear all and rebuild.
     */
    function reset() {
        inst.info("reset start");
        dispatch(exports.datagrid.events.ON_BEFORE_RESET);
        flow.clear();
        // we are going to clear all in the flow before doing a reset.
        state = states.BUILDING;
        destroyScopes();
        // now destroy all of the dom.
        rowOffsets = {};
        active.length = 0;
        scopes.length = 0;
        // keep reference to the old content and add a class to it so we can tell it is old. We will remove it after the render.
        oldContent = content;
        oldContent.addClass("old-content");
        oldContent.children().unbind();
        // make sure scopes are destroyed before this level and listeners as well or this will create a memory leak.
        inst.chunkModel.reset();
        flow.add(updateViewportHeight);
        flow.add(render);
        flow.add(inst.info, [ "reset complete" ]);
        flow.add(dispatch, [ exports.datagrid.events.ON_AFTER_RESET ]);
    }
    /**
     * ###<a name="removeOldContent">removeOldContent</a>###
     * remove the old content div that is staying util the new one
     * is rendered.
     */
    function destroyOldContent() {
        if (oldContent) {
            oldContent.remove();
            oldContent = null;
        }
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
        if (!s && index > 0 && index < inst.rowsLength) {
            s = compileRow(index);
        }
        if (s && !scope.$$phase) {
            activateScope(s);
            s.$digest();
            deactivateScope(s);
        }
    }
    /**
     * ###<a name="onRowTemplateChange">onRowTemplateChange</a>###
     * when changing the template for an individual row.
     */
    function onRowTemplateChange(evt, item, oldTemplate, newTemplate) {
        var index = inst.getNormalizedIndex(item), el = getRowElm(index), s = el.hasClass(options.uncompiledClass) ? compileRow(index) : el.scope();
        if (s !== scope) {
            s.$destroy();
            scopes[index] = null;
            el.replaceWith(inst.templateModel.getTemplate(item).template);
            scopes[index] = compileRow(index);
            updateHeights(index);
        }
    }
    /**
     * ###<a name="updateHeights">updateHeights</a>###
     * force invalidation of heights and recalculate them then render.
     */
    function updateHeights(rowIndex) {
        flow.add(inst.chunkModel.updateAllChunkHeights, [ rowIndex ]);
        flow.add(updateHeightValues);
        flow.add(render);
    }
    /**
     * ###<a name="isLogEvent">isLogEvent</a>###
     * used to compare events to detect log events.
     */
    function isLogEvent(evt) {
        return logEvents.indexOf(evt) !== -1;
    }
    /**
     * ###<a name="dispatch">dispatch</a>###
     * handle dispaching of events from the datagrid.
     */
    function dispatch(event) {
        if (!isLogEvent(event)) inst.log("$emit %s", event);
        // THIS SHOULD ONLY EMIT. Broadcast could perform very poorly especially if there are a lot of rows.
        return scope.$emit.apply(scope, arguments);
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
        scope.datagrid = null;
        // we have a circular reference. break it on destroy.
        inst.log("destroying grid");
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
        $compile = null;
    }
    exports.logWrapper("datagrid", inst, "green", dispatch);
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
        link: function(scope, element, attr) {
            var inst = new Datagrid(scope, element, attr, $compile);
            scope.datagrid = inst;
            // expose to scope.
            each(exports.datagrid.coreAddons, function(method) {
                method.apply(inst, [ inst ]);
            });
            gridAddons(inst, attr.addons);
            inst.start();
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
 * @param {ux.datagrid} inst
 * @returns {{}}
 */
exports.datagrid.coreAddons.chunkModel = function chunkModel(inst) {
    var _list, _rows, _chunkSize, _el, result = exports.logWrapper("chunkModel", {}, "purple", inst.dispatch);
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
        var i = 0, len = list.length, result = new ChunkArray(), childAry, item;
        while (i < len) {
            item = list[i];
            if (i % size === 0) {
                if (childAry) {
                    calculateHeight(childAry);
                }
                childAry = new ChunkArray();
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
            }
            childAry.push(item);
            childAry.max = item.max || i;
            i += 1;
        }
        if (childAry) calculateHeight(childAry);
        if (!result.min) {
            result.min = result[0] ? result[0].min : 0;
            result.max = result[result.length - 1] ? result[result.length - 1].max : 0;
            result.templateStart = templateStart;
            result.templateEnd = templateEnd;
            calculateHeight(result);
            result.dirtyHeight = false;
        }
        return result.length > size ? chunkList(result, size, templateStart, templateEnd) : result;
    }
    /**
     * Using a ChunkArray calculate the heights of each array recursively.
     * @param ary {ChunkArray}
     */
    function calculateHeight(ary) {
        ary.updateHeight(inst.templateModel, _rows);
        if (!ary.rendered) {
            ary.templateStart = ary.templateStart.substr(0, ary.templateStart.length - 1) + ' style="width:100%;height:' + ary.height + 'px;">';
        }
    }
    function updateAllChunkHeights(rowIndex) {
        var indexes = getRowIndexes(rowIndex, _list), ary = getArrayFromIndexes(indexes, _list);
        ary.updateHeight(inst.templateModel, _rows);
        updateChunkHeights(_el, _list, indexes);
    }
    function updateChunkHeights(el, ary) {
        var i = 0, len = ary.length;
        while (i < len) {
            if (ary.dirtyHeight) {
                ary.dirtyHeight = false;
                el[0].style.height = ary.height + "px";
                updateChunkHeights(angular.element(el.children()[i]), ary[i]);
            }
            i += 1;
        }
    }
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
        _list = chunkList(list, size, templateStart, templateEnd);
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
        var indexes = getRowIndexes(rowIndex, _list);
        return buildDomByIndexes(indexes);
    }
    /**
     * Get the domElement by indexes, create the dom if it doesn't exist.
     * @param indexes {Number}
     * @returns {*}
     */
    function buildDomByIndexes(indexes) {
        var i = 0, index, indxs = indexes.slice(0), ca = _list, el = _el;
        while (i < indxs.length) {
            index = indxs.shift();
            if (!ca.rendered) {
                el.html(ca.getChildrenStr());
            }
            ca = ca[index];
            el = angular.element(el.children()[index]);
        }
        return el;
    }
    /**
     * Remove all dom, and all other references.
     */
    function reset() {
        result.log("reset");
        //TODO: this needs to make sure it destroys things properly
        if (_list) _list.destroy();
        _rows = null;
        _list = null;
        _chunkSize = null;
        _el = null;
    }
    function destroy() {
        reset();
        result.destroyLogger();
    }
    result.chunkDom = chunkDom;
    result.getChunkList = getChunkList;
    result.getRowIndexes = function(rowIndex) {
        return getRowIndexes(rowIndex, _list);
    };
    result.getRow = getRow;
    result.reset = reset;
    result.updateAllChunkHeights = updateAllChunkHeights;
    result.destroy = destroy;
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
var ChunkArray = function() {};

ChunkArray.prototype = [];

ChunkArray.prototype.min = 0;

ChunkArray.prototype.max = 0;

ChunkArray.prototype.templateStart = "";

ChunkArray.prototype.templateEnd = "";

ChunkArray.prototype.getStub = function getStub(str) {
    return this.templateStart + str + this.templateEnd;
};

/**
 * **ChunkArray.prototype.getChildStr**
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
    this.rendered = true;
    return str;
};

ChunkArray.prototype.updateHeight = function(templateModel, _rows) {
    var i = 0, len, height = 0;
    if (this[0] instanceof ChunkArray) {
        len = this.length;
        while (i < len) {
            height += this[i].height;
            i += 1;
        }
    } else {
        height = templateModel.getHeight(_rows, this.min, this.max);
    }
    if (this.height !== height) {
        this.dirtyHeight = true;
    }
    this.height = height;
    if (this.dirtyHeight) {
        if (this.parent) this.parent.updateHeight(templateModel, _rows);
    }
};

/**
 * Perform proper cleanup.
 */
ChunkArray.prototype.destroy = function() {
    this.templateStart = "";
    this.templateEnd = "";
    this.templateModel = null;
    this.rendered = false;
    this.parent = null;
    this.length = 0;
};

exports.datagrid.events.ON_RENDER_PROGRESS = "datagrid:onRenderProgress";

exports.datagrid.coreAddons.creepRenderModel = function creepRenderModel(inst) {
    var intv = 0, creepCount = 0, model = {}, upIndex = 0, downIndex = 0, waitHandle, time;
    function digest(index) {
        var s = inst.getScope(index);
        if (!s || !s.digested) {
            // just skip if already digested.
            inst.forceRenderScope(index);
        }
    }
    function calculatePercent() {
        var result = {
            count: 0
        };
        each(inst.scopes, calculateScopePercent, result);
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
    function render(complete, force) {
        var changed = false, now = Date.now();
        if (time > now && (upIndex >= 0 || downIndex < inst.rowsLength)) {
            if (upIndex >= 0) {
                changed = force || !inst.isCompiled(upIndex);
                if (changed) digest(upIndex);
                upIndex -= 1;
            }
            if (downIndex < inst.rowsLength) {
                changed = force || changed || !inst.isCompiled(downIndex);
                if (changed) digest(downIndex);
                downIndex += 1;
            }
            render(complete, force);
        } else {
            complete();
        }
    }
    function onComplete() {
        stop();
        creepCount += 1;
        if (!inst.values.speed && inst.scopes.length < inst.rowsLength) {
            resetInterval(upIndex, downIndex);
        }
        inst.dispatch(exports.datagrid.events.ON_RENDER_PROGRESS, calculatePercent());
    }
    function stop() {
        time = 0;
        clearTimeout(intv);
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
        creepCount = inst.options.creepLimit;
        stop();
    }
    function onAfterRender(event, loopData, forceCompileRowRender) {
        creepCount = 0;
        upIndex = loopData.started || 0;
        downIndex = loopData.ended || 0;
        renderLater(event, forceCompileRowRender);
    }
    model.stop = stop;
    // allow external stop of creep render.
    model.destroy = function destroy() {
        stop();
        inst = null;
        model = null;
    };
    inst.creepRenderModel = model;
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.BEFORE_VIRTUAL_SCROLL_START, onBeforeRender));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_VIRTUAL_SCROLL_UPDATE, onBeforeRender));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.TOUCH_DOWN, onBeforeRender));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.SCROLL_START, onBeforeRender));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_RESET, onBeforeRender));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_UPDATE_WATCHERS, onAfterRender));
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.creepRenderModel);

/*global ux */
exports.datagrid.coreAddons.normalizeModel = function normalizeModel(inst) {
    //TODO: this needs to be put on exp.normalizedModel
    var originalData, normalizedData, result = exports.logWrapper("normalizeModel", {}, "grey", inst.dispatch);
    function normalize(data, grouped, normalized) {
        data = data || [];
        var i = 0, len = data.length;
        normalized = normalized || [];
        while (i < len) {
            normalized.push(data[i]);
            if (data[i] && data[i][grouped]) {
                normalize(data[i][grouped], grouped, normalized);
            }
            i += 1;
        }
        return normalized;
    }
    inst.setData = function(data, grouped) {
        result.log("setData");
        originalData = data;
        if (grouped) {
            normalizedData = normalize(data, grouped);
        } else {
            normalizedData = data && data.slice(0) || [];
        }
        return normalizedData;
    };
    inst.getData = function() {
        return normalizedData;
    };
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
     * ##<a name="findItem">findItem</a>##
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
     * Get the normalized index for an item.
     * @param item
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
    result.destroy = function destroy() {
        result.destroyLogger();
        result = null;
    };
    inst.normalizeModel = result;
    return inst;
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.normalizeModel);

/*global ux */
exports.datagrid.events.SCROLL_START = "datagrid:scrollStart";

exports.datagrid.events.SCROLL_STOP = "datagrid:scrollStop";

exports.datagrid.events.TOUCH_DOWN = "datagrid:touchDown";

exports.datagrid.events.TOUCH_UP = "datagrid:touchUp";

exports.datagrid.coreAddons.scrollModel = function scrollModel(inst) {
    var result = exports.logWrapper("scrollModel", {}, "orange", inst.dispatch), setup = false, unwatchSetup, waitForStopIntv, scrollListeners = [];
    /**
     * Listen for scrollingEvents.
     */
    function setupScrolling() {
        if (!inst.element.css("overflow")) {
            inst.element.css({
                overflow: "auto"
            });
        }
        result.log("addScrollListener");
        inst.element[0].addEventListener("scroll", onUpdateScrollHandler);
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.SCROLL_TO_INDEX, function(event, index) {
            result.scrollToIndex(index, true);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.SCROLL_TO_ITEM, function(event, item) {
            result.scrollToItem(item, true);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.SCROLL_INTO_VIEW, function(event, itemOrIndex) {
            result.scrollIntoView(itemOrIndex, true);
        }));
        addTouchEvents();
        setup = true;
        inst.flow.unique(result.onScrollingStop);
    }
    function onBeforeReset() {
        result.removeTouchEvents();
    }
    function onAfterReset() {
        addTouchEvents();
    }
    function addTouchEvents() {
        result.log("addTouchEvents");
        var content = inst.getContent();
        content.bind("touchstart", result.onTouchStart);
        content.bind("touchend", result.onTouchEnd);
        content.bind("touchcancel", result.onTouchEnd);
    }
    result.removeScrollListener = function removeScrollListener() {
        result.log("removeScrollListener");
        inst.element[0].removeEventListener("scroll", onUpdateScrollHandler);
    };
    result.removeTouchEvents = function removeTouchEvents() {
        if (setup) {
            result.log("removeTouchEvents");
            inst.getContent().unbind("touchstart", result.onTouchStart);
            inst.getContent().unbind("touchend", result.onTouchEnd);
            inst.getContent().unbind("touchcancel", result.onTouchEnd);
        }
    };
    result.onTouchStart = function onTouchStart(event) {
        inst.values.touchDown = true;
        inst.dispatch(exports.datagrid.events.TOUCH_DOWN, event);
    };
    result.onTouchEnd = function onTouchEnd(event) {
        inst.values.touchDown = false;
        inst.dispatch(exports.datagrid.events.TOUCH_UP, event);
    };
    result.getScroll = function getScroll(el) {
        return (el || inst.element[0]).scrollTop;
    };
    result.setScroll = function setScroll(value) {
        inst.element[0].scrollTop = value;
        inst.values.scroll = value;
    };
    function onUpdateScrollHandler(event) {
        inst.flow.add(result.onUpdateScroll, [ event ]);
    }
    /**
     * When a scrollEvent is fired, recalculate the values.
     * @param event
     */
    result.onUpdateScroll = function onUpdateScroll(event) {
        var val = result.getScroll(event.target || event.srcElement);
        if (inst.values.scroll !== val) {
            inst.dispatch(exports.datagrid.events.SCROLL_START, val);
            inst.values.speed = val - inst.values.scroll;
            inst.values.absSpeed = Math.abs(inst.values.speed);
            inst.values.scroll = val;
            inst.values.scrollPercent = (inst.values.scroll / inst.getContentHeight() * 100).toFixed(2);
        }
        result.waitForStop();
        inst.dispatch(exports.datagrid.events.ON_SCROLL, inst.values);
    };
    /**
     * Scroll to the numeric value.
     * @param value
     * @param {Boolean=} immediately
     */
    result.scrollTo = function scrollTo(value, immediately) {
        result.setScroll(value);
        if (immediately) {
            result.onScrollingStop();
        } else {
            result.waitForStop();
        }
    };
    result.clearOnScrollingStop = function clearOnScrollingStop() {
        inst.flow.remove(result.onScrollingStop);
    };
    function flowWaitForStop() {
        inst.flow.add(result.onScrollingStop);
    }
    /**
     * Wait for the datagrid to slow down enough to render.
     */
    result.waitForStop = function waitForStop() {
        if (inst.flow.async || inst.values.touchDown) {
            clearTimeout(waitForStopIntv);
            waitForStopIntv = setTimeout(flowWaitForStop, inst.options.updateDelay);
        } else {
            flowWaitForStop();
        }
    };
    /**
     * When it stops render.
     */
    result.onScrollingStop = function onScrollingStop() {
        inst.values.speed = 0;
        inst.values.absSpeed = 0;
        inst.flow.add(inst.render);
        inst.dispatch(exports.datagrid.events.SCROLL_STOP, inst.values.scroll);
    };
    /**
     * Scroll to the normalized index.
     * @param index
     * @param {Boolean=} immediately
     */
    result.scrollToIndex = function scrollToIndex(index, immediately) {
        result.log("scrollToIndex");
        var offset = inst.getRowOffset(index);
        result.scrollTo(offset, immediately);
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
            return result.scrollToIndex(index, immediately);
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
        if (offset < inst.values.scroll) {
            // it is above the view.
            result.scrollTo(offset, immediately);
            return;
        }
        viewHeight = inst.getViewportHeight();
        rowHeight = inst.templateModel.getTemplateHeight(inst.getData()[index]);
        if (offset >= inst.values.scroll + viewHeight - rowHeight) {
            // it is below the view.
            result.scrollTo(offset - viewHeight + rowHeight);
        }
    };
    /**
     * Scroll to top.
     * @param immediately
     */
    result.scrollToTop = function(immediately) {
        result.log("scrollToTop");
        result.scrollTo(0, immediately);
    };
    /**
     * Scroll to bottom.
     * @param immediately
     */
    result.scrollToBottom = function(immediately) {
        result.log("scrollToBottom");
        var value = inst.getContentHeight() - inst.getViewportHeight();
        result.scrollTo(value >= 0 ? value : 0, immediately);
    };
    function destroy() {
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
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_RESET, onBeforeReset));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_READY, onAfterReset));
    result.destroy = destroy;
    inst.scrollModel = result;
    // all models should try not to pollute the main model to keep it clean.
    return inst;
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.scrollModel);

/*global angular */
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
        var templates = [], totalHeight, defaultName = "default", result = exports.logWrapper("templateModel", {}, "teal", inst.dispatch);
        function createTemplates() {
            result.log("createTemplates");
            var i, scriptTemplates = inst.element[0].getElementsByTagName("script"), len = scriptTemplates.length;
            if (!len) {
                throw new Error("at least one template is required.");
            }
            for (i = 0; i < len; i += 1) {
                createTemplate(scriptTemplates[i]);
            }
            while (scriptTemplates.length) {
                inst.element[0].removeChild(scriptTemplates[0]);
            }
        }
        function createTemplate(scriptTemplate) {
            var template = trim(angular.element(scriptTemplate).html()), wrapper = document.createElement("div"), name = getScriptTemplateAttribute(scriptTemplate, "template-name") || defaultName, templateData;
            wrapper.className = "grid-template-wrapper";
            template = angular.element(template)[0];
            template.className += " " + inst.options.uncompiledClass + " {{$status}}";
            template.setAttribute("template", name);
            inst.getContent()[0].appendChild(wrapper);
            wrapper.appendChild(template);
            template = trim(wrapper.innerHTML);
            templateData = {
                name: name,
                item: getScriptTemplateAttribute(scriptTemplate, "template-item"),
                template: template,
                height: wrapper.offsetHeight
            };
            result.log("template: %s %o", name, templateData);
            if (!templateData.height) {
                throw new Error("Template height cannot be 0.");
            }
            templates[templateData.name] = templateData;
            templates.push(templateData);
            inst.getContent()[0].removeChild(wrapper);
            totalHeight = 0;
            // reset cached value.
            return templateData;
        }
        function getScriptTemplateAttribute(scriptTemplate, attrStr) {
            var node = scriptTemplate.attributes["data-" + attrStr] || scriptTemplate.attributes[attrStr];
            return node && node.nodeValue || "";
        }
        function getTemplates() {
            return templates;
        }
        /**
         * Use the data object from each item in the array to determine the template for that item.
         * @param data
         */
        result.getTemplate = function getTemplate(data) {
            return result.getTemplateByName(data._template);
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
                if (templates.hasOwnProperty(i)) {
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
            return result.getTemplate(item).height;
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
            item._template = templateName;
        }
        function setTemplate(itemOrIndex, newTemplateName) {
            result.log("setTemplate %s %s", itemOrIndex, newTemplateName);
            var item = typeof itemOrIndex === "number" ? inst.data[itemOrIndex] : itemOrIndex;
            var oldTemplate = result.getTemplate(item).name;
            result.setTemplateName(item, newTemplateName);
            inst.dispatch(exports.datagrid.events.ON_ROW_TEMPLATE_CHANGE, item, oldTemplate, newTemplateName);
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
        function destroy() {
            result.destroyLogger();
            result = null;
            templates.length = 0;
            templates = null;
        }
        result.defaultName = defaultName;
        result.createTemplates = createTemplates;
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
        result.destroy = destroy;
        return result;
    }();
    return inst.templateModel;
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.templateModel);
}(this.ux = this.ux || {}, function() {return this;}()));
