/*
* uxDatagrid v.0.2.0
* (c) 2014, WebUX
* License: MIT.
*/
(function(exports, global){
// ## Configs ##
// ux.datagrid is a highly performant scrolling list for desktop and mobile devices that leverages
// the browsers ability to gpu cache the dom structure with fast startup times and optimized rendering
// that allows the gpu to maintain its snapshots as long as possible.
// Create the default module of ux if it doesn't already exist.
var module;

try {
    module = angular.module("ux", [ "ng" ]);
} catch (e) {
    module = angular.module("ux");
}

// Create the datagrid namespace.
// add the default options for the datagrid. These can be overridden by passing your own options to each
// instance of the grid. In your HTML templates you can provide the object that will override these settings
// on a per grid basis.
//
//      <div ux-datagrid="mylist" options="{debug:{all:1, Flow:0}}">...</div>
//
// These options are then available to other addons to configure them.
exports.datagrid = {
    // **<a name="isIOS">isIOS</a>**
    // iOS does not natively support smooth scrolling without a css attribute. `-webkit-overflow-scrolling: touch`
    // however with this attribute iOS would crash if you try to change the scroll with javascript, or turn it on and off.
    // so a virtual scroll was implemented for iOS to make it scroll using translate3d.
    isIOS: navigator.userAgent.match(/(iPad|iPhone|iPod)/g),
    // the **states** of the application.
    //  - **<a name="states.BUILDING">BUILDING</a>**: is the startup phase of the grid before it is ready to perform the first render. This may include
    // waiting for the dom heights be available.
    //  - **<a name="states.READY">READY</a>**: this means that the grid is ready for rendering.
    states: {
        BUILDING: "datagrid:building",
        READY: "datagrid:ready"
    },
    // **<a name="events">Events</a>**
    // - **<a name="events.INIT">INIT</a>** when the datagrid has added the addons and is now starting.
    // - **<a name="events.RESIZE">RESIZE</a>** tells the datagrid to resize. This will update all height calculations.
    // - **<a name="events.READY">READY</a>** the datagrid is all setup with templates, viewHeight, and data and is ready to render.
    // - **<a name="events.BEFORE_RENDER">BEFORE_RENDER</a>** the datagrid is just about to add needed chunks, perform compiling of uncompiled rows, and update and digest the active scopes.
    // - **<a name="events.AFTER_RENDER">AFTER_RENDER</a>** chunked dome was added if needed, active rows are compiled, and active scopes are digested.
    events: {
        INIT: "datagrid:init",
        RESIZE: "datagrid:resize",
        READY: "datagrid:ready",
        BEFORE_RENDER: "datagrid:beforeRender",
        AFTER_RENDER: "datagrid:afterRender",
        LISTENERS_READY: "datagrid:listenersReady",
        BEFORE_UPDATE_WATCHERS: "datagrid:beforeUpdateWatchers",
        AFTER_UPDATE_WATCHERS: "datagrid:afterUpdateWatchers",
        BEFORE_DATA_CHANGE: "datagrid:beforeDataChange",
        AFTER_DATA_CHANGE: "datagrid:afterDataChange",
        BEFORE_RENDER_AFTER_DATA_CHANGE: "datagrid:beforeRenderAfterDataChange",
        RENDER_AFTER_DATA_CHANGE: "datagrid:renderAfterDataChange",
        ON_ROW_TEMPLATE_CHANGE: "datagrid:onRowTemplateChange",
        ON_SCROLL: "datagrid:onScroll",
        // for logging.
        LOG: "datagrid:log",
        INFO: "datagrid:info",
        WARN: "datagrid:warn",
        ERROR: "datagrid:error"
    },
    options: {
        async: true,
        compileAllRowsOnInit: false,
        // this can cause it to take a long time to initialize.
        updateDelay: 500,
        // if < 100ms this fires too often.
        cushion: -50,
        // debugging cushion about what is deactivated.
        chunkSize: 50,
        uncompiledClass: "uncompiled",
        dynamicRowHeights: false,
        //true,
        renderThreshold: 10,
        renderThresholdWait: 50,
        creepLimit: 100,
        chunkClass: "ux-datagrid-chunk"
    },
    coreAddons: []
};

/*global module */
module.factory("addons", [ "$injector", function($injector) {
    function applyAddons(addons, instance) {
        var i = 0, len = addons.length, result;
        while (i < len) {
            result = $injector.get(addons[i]);
            if (typeof result === "function") {
                result(instance);
            } else {
                // they must have returned a null? what was the point. Throw an error.
                throw new Error("Addons expect a function to pass the grid instance to.");
            }
            i += 1;
        }
    }
    return function(instance, addons) {
        addons = addons instanceof Array ? addons : addons && addons.replace(/,/g, " ").replace(/\s+/g, " ").split(" ") || [];
        if (instance.addons) {
            addons = instance.addons = instance.addons.concat(addons);
        }
        applyAddons(addons, instance);
    };
} ]);

function charPack(char, amount) {
    var str = "";
    while (str.length < amount) {
        str += char;
    }
    return str;
}

exports.css = function CSS() {
    var customStyleSheets = {}, cache = {}, cnst = {
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
    function getCSSValue(selector, property) {
        var cls = getSelector(selector);
        return cls && cls[property] !== undefined ? cls[property] : null;
    }
    function setCSSValue(selector, property, value) {
        var cls = getSelector(selector);
        cls[property] = value;
    }
    return {
        createdStyleSheets: [],
        createStyleSheet: createStyleSheet,
        createClass: createClass,
        getCSSValue: getCSSValue,
        setCSSValue: setCSSValue
    };
}();

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

function filter(list, method, data) {
    var i = 0, len, result = [];
    if (list && list.length) {
        len = list.length;
        while (i < len) {
            if (method(list[i], i, list, data)) {
                result.push(list[i]);
            }
            i += 1;
        }
    } else {
        for (i in list) {
            if (list.hasOwnProperty(i)) {
                if (method(list[i], i, list, data)) {
                    result.push(list[i]);
                }
            }
        }
    }
    return result;
}

exports.filter = filter;

function dispatcher(target, scope, map) {
    var listeners = {};
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
    function on(event, callback) {
        listeners[event] = listeners[event] || [];
        listeners[event].push(callback);
        return function() {
            off(event, callback);
        };
    }
    function fire(callback, args) {
        return callback && callback.apply(target, args);
    }
    /**
     * @param event
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
        target.dispatch = scope[map.dispatch].bind(scope);
    } else {
        target.on = on;
        target.off = off;
        target.dispatch = dispatch;
    }
}

function toArray(obj) {
    var result = [], i = 0, len = obj.length;
    while (i < len) {
        result.push(obj[i]);
        i += 1;
    }
    return result;
}

//The ECMAScript standard does not guarantee Array.sort is a stable sort.
// According to the ECMA spec, when two objects are determined to be equal in a custom sort,
// JavaScript is not required to leave those two objects in the same order.
// replace sort from ECMAScript with this bubble sort to make it accurate
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

function Flow(exp, dispatch) {
    var running = false, intv, current = null, list = [], uniqueMethods = {}, execStartTime, execEndTime, timeouts = {}, consoleMethodStyle = "color:#666666;";
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
                exp.log("clear duplicate item %c%s", consoleMethodStyle, item.label);
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
            exp.log("exec timeout method %c%s %sms", consoleMethodStyle, item.label, Date.now() - startTime);
            method();
        };
        exp.log("wait for timeout method %c%s", consoleMethodStyle, item.label);
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
        exp.log("finish %c%s took %dms", consoleMethodStyle, current.label, execEndTime - execStartTime);
        current = null;
        list.shift();
        if (list.length) {
            next();
        }
        return execEndTime - execStartTime;
    }
    function next() {
        if (!current && list.length) {
            current = list[0];
            if (exp.async && current.delay !== undefined) {
                exp.log("	delay for %c%s %sms", consoleMethodStyle, current.label, current.delay);
                clearTimeout(intv);
                intv = setTimeout(exec, current.delay);
            } else {
                exec();
            }
        }
    }
    function exec() {
        exp.log("start method %c%s", consoleMethodStyle, current.label);
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
    function destroy() {
        clearTimeout(intv);
        list.length = 0;
        exp = null;
    }
    exp = exports.logWrapper("Flow", exp || {}, "grey", dispatch);
    exp.async = exp.hasOwnProperty("async") ? exp.async : true;
    exp.debug = exp.hasOwnProperty("debug") ? exp.debug : 0;
    exp.insert = insert;
    exp.add = add;
    exp.unique = unique;
    exp.remove = remove;
    exp.timeout = timeout;
    exp.stopTimeout = stopTimeout;
    exp.run = run;
    exp.destroy = destroy;
    //    exp.log = function () {
    //        var args;
    //        if (exp.debug && exp.debug <= 1) {
    //            args = ux.util.array.toArray(arguments);
    //            if (args[0].indexOf('%c') === -1) {
    //                args[0] = '%c' + args[0];
    //                args.splice(1, 0, consoleMethodStyle);
    //            }
    //            console.log.apply(console, args);
    //        }
    //    };
    //    exp.info = function () {
    //        var args;
    //        if (exp.debug && exp.debug <= 2) {
    //            args = ux.util.array.toArray(arguments);
    //            args[0] = '%c' + args[0];
    //            args.splice(1, 0, consoleInfoMethodStyle);
    //            console.info.apply(console, args);
    //        }
    //    };
    //    exp.warn = function () {
    //        // output warnings. something is wrong.
    //        if (window.console && console.warn) {
    //            console.warn.apply(console, arguments);
    //        }
    //    };
    return exp;
}

exports.datagrid.Flow = Flow;

/*global each, charPack, Flow, exports, module */
// Datagrid Core
// -----------------
// The datagrid manages the `core addons` to build the initial list and provide the public api necessary
// to communicate with other addons.
// Datagrid uses script templates inside of the dom to create your elements. Addons that are added to the addon
// attribute.
function Datagrid(scope, element, attr, $compile) {
    // core variables
    var flow, // flow management for methods of the datagrid. Keeping functions firing in the correct order especially if async methods are executed.
    waitCount = 0, // waiting to render. If it fails too many times. it will die.
    changeWatcherSet = false, //flag for change watchers.
    unwatchers = [], // list of scope listeners that we want to clear on destroy
    content, // the dom element with all of the chunks.
    scopes = [], // the array of all scopes that have been compiled.
    active = [], // the scopes that are currently active.
    lastVisibleScrollStart = 0, // cached index to improve render loop by starting where it left off.
    rowOffsets = {}, // cache for the heights of the rows for faster height calculations.
    viewHeight = 0, // the visual area height.
    options, // configs that are shared through the datagrid and addons.
    states = exports.datagrid.states, // local reference to the states constants
    events = exports.datagrid.events, // local reference to the events constants
    state = states.BUILDING, // `state` of the app. Building || Ready.
    values = {
        // `values` is the object that is used to share data for scrolling and other shared values.
        dirty: false,
        // if the data is dirty and a render has not happended since the data change.
        scroll: 0,
        // current scroll value of the grid
        speed: 0,
        // current speed of the scroll
        absSpeed: 0,
        // current absSpeed of the grid.
        scrollPercent: 0,
        // the current percent position of the scroll.
        touchDown: false,
        // if there is currently a touch start and not a touch end. Since touch is used for scrolling on a touch device. Ignored for desktop.
        scrollingStopIntv: null,
        // interval that allows waits for checks to know when the scrolling has stopped and a render is needed.
        activeRange: {
            min: 0,
            max: 0
        }
    }, exp = {};
    // the datagrid public api
    // Initialize the datagrid.
    // add unique methods to the flow.
    function init() {
        flow.unique(render);
        flow.unique(updateRowWatchers);
    }
    // Build out the public api variables for the datagrid.
    function setupExports() {
        exp.scope = scope;
        exp.element = element;
        exp.attr = attr;
        exp.rowsLength = 0;
        exp.scopes = scopes;
        exp.data = exp.data || [];
        exp.unwatchers = unwatchers;
        exp.values = values;
        exp.start = start;
        exp.reset = reset;
        exp.forceRenderScope = forceRenderScope;
        exp.dispatch = dispatch;
        exp.render = function() {
            flow.add(render);
        };
        exp.updateHeights = updateHeights;
        exp.getOffsetIndex = getOffsetIndex;
        exp.isActive = isActive;
        exp.isCompiled = isCompiled;
        exp.getScope = getScope;
        exp.getRowElm = getRowElm;
        exp.getRowOffset = getRowOffset;
        exp.getRowHeight = getRowHeight;
        exp.getViewportHeight = getViewportHeight;
        exp.getContentHeight = getContentHeight;
        exp.getContent = getContent;
        exp.safeDigest = safeDigest;
        exp.getRowIndexFromElement = getRowIndexFromElement;
        exp.options = options = angular.extend({}, exports.datagrid.options, scope.$eval(attr.options) || {});
        exp.flow = flow = new Flow({
            async: options.hasOwnProperty("async") ? !!options.async : true,
            debug: options.hasOwnProperty("debug") ? options.debug : 0
        }, exp.dispatch);
        flow.add(init);
        // initialize core.
        flow.run();
    }
    // The `content` dom element is the only direct child created by the datagrid.
    // It is used so append all of the `chunks` so that the it can be scrolled.
    // If the dom element is provided with the class `content` then that dom element will be used
    // allowing the user to add custom classes directly tot he `content` dom element.
    function createContent() {
        var cnt = element[0].getElementsByClassName("content")[0], classes = "content";
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
    // return the reference to the content div.
    function getContent() {
        return content;
    }
    // `start` is called after the addons are added.
    function start() {
        exp.dispatch(exports.datagrid.events.INIT);
        content = createContent();
        waitForElementReady(0);
    }
    // this waits for the body element because if the grid has been constructed, but no heights are showing
    // it is usually because the grid has not been attached to the document yet. So wait for the heights
    // to be available, but only wait a little then exit.
    function waitForElementReady(count) {
        if (!exp.element[0].offsetHeight) {
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
        flow.add(exp.templateModel.createTemplates, null, 0);
        // allow element to be added to dom.
        // if the templates have different heights. Then they are dynamic.
        flow.add(function updateDynamicRowHeights() {
            options.dynamicRowHeights = exp.templateModel.dynamicHeights();
        });
        flow.add(addListeners);
    }
    function addListeners() {
        window.addEventListener("resize", onResize);
        unwatchers.push(scope.$on(exports.datagrid.events.ON_ROW_TEMPLATE_CHANGE, onRowTemplateChange));
        unwatchers.push(scope.$on("$destroy", destroy));
        flow.add(setupChangeWatcher, [], 0);
        exp.dispatch(exports.datagrid.events.LISTENERS_READY);
    }
    function setupChangeWatcher() {
        if (!changeWatcherSet) {
            changeWatcherSet = true;
            var lastLength = 0, lastResult = null, len;
            unwatchers.push(scope.$watch(function() {
                var result = scope.$eval(attr.uxDatagrid);
                len = result && result.length || 0;
                if (lastResult === result && lastLength !== len) {
                    //TODO: this needs tested to make sure it calls if the length changes.
                    flow.add(onDataChanged);
                }
                lastResult = result;
                lastLength = len;
                return result;
            }, function() {
                flow.add(onDataChanged);
            }));
            safeDigest(scope);
        }
    }
    exp.upateViewportHeight = function upateViewportHeight() {
        viewHeight = exp.calculateViewportHeight();
    };
    /**
     * Be careful. This method is VERY expensive when there are lots of rows.
     */
    exp.calculateViewportHeight = function calculateViewportHeight() {
        return element[0].offsetHeight;
    };
    function onResize(event) {
        dispatch(exports.datagrid.events.RESIZE, {
            event: event
        });
    }
    function getScope(index) {
        return scopes[index];
    }
    function getRowElm(index) {
        return angular.element(exp.chunkModel.getRow(index));
    }
    function isCompiled(index) {
        return !!scopes[index];
    }
    function getRowIndexFromElement(el) {
        if (element[0].contains(el[0] || el)) {
            var s = el.scope ? el.scope() : angular.element(el).scope();
            // make sure we get the right scope to grab the index from. We need to get it from a row.
            while (s && s.$parent !== exp.scope) {
                s = s.$parent;
            }
            return s.$index;
        }
        return -1;
    }
    //TODO: need to reset row heights when a row is activated for the first time.... possibly every time for expanding rows.
    // TODO: may want to update heights through a hierarchy for expanding rows.
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
    function getRowHeight(index) {
        return exp.templateModel.getTemplateHeight(exp.data[index]);
    }
    function getViewportHeight() {
        return viewHeight;
    }
    function getContentHeight() {
        return exp.chunkModel.getChunkList().height;
    }
    function createDom(list) {
        //TODO: if there is any dom. It needs destroyed first.
        exp.log("OVERWRITE DOM!!!");
        var len = list.length;
        flow.add(exp.chunkModel.chunkDom, [ list, options.chunkSize, '<div class="' + options.chunkClass + '">', "</div>", content ], 0);
        exp.rowsLength = len;
        exp.log("created %s dom elements", len);
    }
    function compileRow(index) {
        var s = scopes[index], prev, tpl, el, unwatch;
        if (!s) {
            s = scope.$new();
            prev = getScope(index - 1);
            tpl = exp.templateModel.getTemplate(exp.data[index]);
            if (prev) {
                prev.$$nextSibling = s;
                s.$$prevSibling = prev;
            }
            s.$status = "compiled";
            s[tpl.item] = exp.data[index];
            // set the data to the scope.
            s.$index = index;
            unwatch = s.$watch(function() {
                s.digested = true;
                unwatch();
            });
            scopes[index] = s;
            el = getRowElm(index);
            el.removeClass(options.uncompiledClass);
            $compile(el)(s);
            deactivateScope(s);
        }
        return s;
    }
    function buildRows(list) {
        state = states.BUILDING;
        flow.insert(createDom, [ list ], 0);
    }
    function ready() {
        state = states.READY;
        flow.add(render);
        flow.add(fireReadyEvent);
        flow.add(safeDigest, [ scope ]);
    }
    function fireReadyEvent() {
        scope.$emit(exports.datagrid.events.READY);
    }
    function safeDigest(s) {
        if (!s.$$phase) {
            s.$digest();
        }
    }
    /**
     * Turn off watchers for that index scope and any of it's children.
     * @param s
     */
    function deactivateScope(s) {
        var child;
        // if the scope is not created yet. just skip.
        if (s && !isActive(s)) {
            // do not deactivate one that is already deactivated.
            s.$$$watchers = s.$$watchers;
            s.$$watchers = [];
            // recursively go through children and deactivate them.
            if (s.$$childHead) {
                child = s.$$childHead;
                while (child) {
                    deactivateScope(child);
                    child = child.$$nextSibling;
                }
            }
            return true;
        }
        return false;
    }
    /**
     * Turn on watchers for that index scope and any of it's children.
     * @param s
     */
    function activateScope(s) {
        var child;
        if (s && s.$$$watchers) {
            // do not activate one that is already active.
            s.$$watchers = s.$$$watchers;
            s.$$$watchers = null;
            // recursively go through children and activate them.
            if (s.$$childHead) {
                child = s.$$childHead;
                while (child) {
                    activateScope(child);
                    child = child.$$nextSibling;
                }
            }
            return true;
        }
        return !!(s && !s.$$$watchers);
    }
    function isActive(index) {
        var s = scopes[index];
        return !!(s && !s.$$$watchers);
    }
    function getOffsetIndex(offset) {
        // updateHeightValues must be called before this.
        var est = Math.floor(offset / exp.templateModel.averageTemplateHeight()), i = 0;
        if (rowOffsets[est] && rowOffsets[est] <= offset) {
            i = est;
        }
        while (i < exp.rowsLength) {
            if (rowOffsets[i] > offset) {
                return i - 1;
            }
            i += 1;
        }
        return i;
    }
    function getStartingIndex() {
        // we will take the last first active element. We will start counting from there till we get to the top
        // of the start area. So we never have to loop the whole thing.
        var height = viewHeight, result = {
            startIndex: 0,
            i: 0,
            inc: 1,
            end: exp.rowsLength,
            visibleScrollStart: values.scroll + options.cushion,
            visibleScrollEnd: values.scroll + height - options.cushion
        };
        result.startIndex = result.i = getOffsetIndex(values.scroll);
        return result;
    }
    function updateHeightValues() {
        //TODO: this is going to be updated to use ChunkArray data to be faster.
        var height = 0, i = 0;
        while (i < exp.rowsLength) {
            rowOffsets[i] = height;
            height += exp.templateModel.getTemplateHeight(exp.data[i]);
            i += 1;
        }
        options.rowHeight = exp.rowsLength ? exp.templateModel.getTemplateHeight("default") : 0;
    }
    /**
     * Activate or deactivate scopes that are within range.
     */
    function updateRowWatchers() {
        var loop = getStartingIndex(), offset = loop.i * 40, lastActive = [].concat(active), lastActiveIndex, s, prevS;
        if (loop.i < 0) {
            // then scroll is negative. ignore it.
            return;
        }
        exp.dispatch(events.BEFORE_UPDATE_WATCHERS, loop);
        // we only want to update stuff if we are scrolling slow.
        resetMinMax();
        // this needs to always be set after the dispatch of before update watchers in case they need the before activeRange.
        active.length = 0;
        // make sure not to reset until after getStartingIndex.
        exp.log("	visibleScrollStart %s visibleScrollEnd %s", loop.visibleScrollStart, loop.visibleScrollEnd);
        while (loop.i < exp.rowsLength) {
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
        exp.log("	startIndex %s endIndex %s", loop.startIndex, loop.i);
        deactivateList(lastActive);
        lastVisibleScrollStart = loop.visibleScrollStart;
        exp.log("	activated %s", active.join(", "));
        updateLinks();
        flow.add(safeDigest, [ scope ]);
        // this dispatch needs to be after the digest so that it doesn't cause {} to show up in the render.
        exp.dispatch(events.AFTER_UPDATE_WATCHERS, loop);
    }
    function deactivateList(lastActive) {
        var lastActiveIndex, deactivated = [];
        while (lastActive.length) {
            lastActiveIndex = lastActive.pop();
            deactivated.push(lastActiveIndex);
            deactivateScope(scopes[lastActiveIndex]);
        }
        exp.log("	deactivated %s", deactivated.join(", "));
    }
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
    function resetMinMax() {
        values.activeRange.min = values.activeRange.max = -1;
    }
    function updateMinMax(activeIndex) {
        values.activeRange.min = values.activeRange.min < activeIndex && values.activeRange.min >= 0 ? values.activeRange.min : activeIndex;
        values.activeRange.max = values.activeRange.max > activeIndex && values.activeRange.max >= 0 ? values.activeRange.max : activeIndex;
    }
    function beforeRenderAfterDataChange() {
        if (values.dirty) {
            dispatch(exports.datagrid.events.BEFORE_RENDER_AFTER_DATA_CHANGE);
        }
    }
    function afterRenderAfterDataChange() {
        if (values.dirty) {
            values.dirty = false;
            dispatch(exports.datagrid.events.RENDER_AFTER_DATA_CHANGE);
        }
    }
    function readyToRender() {
        if (!viewHeight) {
            exp.upateViewportHeight();
            waitCount += 1;
            if (waitCount < 2) {
                exp.info(exports + ".datagrid is waiting for element to have a height.");
                flow.add(render, null, 0);
            } else {
                flow.warn("Datagrid: Unable to determine a height for the datagrid. Cannot render. Exiting.");
            }
            return false;
        }
        return true;
    }
    function render() {
        exp.dispatch(exports.datagrid.events.BEFORE_RENDER);
        if (readyToRender()) {
            waitCount = 0;
            // Where [states.BUILDING](#states.BUILDING) is used
            if (state === states.BUILDING) {
                //TODO: removeExtraRows is not compatible. It needs removed. Only buildRows will work with chunking.
                //flow.add(removeExtraRows, [exp.data]);// if our data updates we need to remove extra rows.
                flow.add(buildRows, [ exp.data ], 0);
                flow.add(updateHeightValues);
                flow.add(ready);
            } else if (state === states.READY) {
                flow.add(beforeRenderAfterDataChange);
                flow.add(updateRowWatchers);
                flow.add(afterRenderAfterDataChange);
            } else {
                throw new Error("RENDER STATE INVALID");
            }
        }
        flow.add(exp.dispatch, [ exports.datagrid.events.AFTER_RENDER ]);
    }
    function onDataChanged() {
        dispatch(exports.datagrid.events.BEFORE_DATA_CHANGE);
        values.dirty = true;
        exp.log("dataChanged");
        exp.grouped = scope.$eval(attr.grouped);
        exp.data = exp.setData(scope.$eval(attr.uxDatagrid || attr.list), exp.grouped) || [];
        dispatch(exports.datagrid.events.AFTER_DATA_CHANGE);
        flow.add(reset);
    }
    //reset = clear all and restart.
    function reset() {
        destroyScopes();
        // now destroy all of the dom.
        rowOffsets = {};
        active.length = 0;
        scopes.length = 0;
        content.children().unbind();
        content.children().remove();
        viewHeight = 0;
        // force to recalculate heights.
        setupExports();
        // make sure scopes are destroyed before this level and listeners as well or this will create a memory leak.
        exp.chunkModel.reset();
        state = states.BUILDING;
        flow.add(render);
    }
    function forceRenderScope(index) {
        var s = scopes[index];
        //        exp.log("\tforceRenderScope %s", index);
        if (!s && index > 0 && index < exp.rowsLength) {
            s = compileRow(index);
        }
        if (s && !scope.$$phase) {
            activateScope(s);
            s.$digest();
            deactivateScope(s);
        }
    }
    function onRowTemplateChange(evt, item, oldTemplate, newTemplate) {
        var index = exp.getNormalizedIndex(item), el = getRowElm(index), s = el.hasClass(options.uncompiledClass) ? compileRow(index) : el.scope();
        if (s !== scope) {
            s.$destroy();
            scopes[index] = null;
            el.replaceWith(exp.templateModel.getTemplate(item).template);
            scopes[index] = compileRow(index);
            updateHeights(index);
        }
    }
    function updateHeights(rowIndex) {
        flow.add(exp.chunkModel.updateAllChunkHeights, [ rowIndex ]);
        flow.add(updateHeightValues);
        flow.add(render);
    }
    function dispatch() {
        scope.$emit.apply(scope, arguments);
    }
    function destroyScopes() {
        // because child scopes may not be in order because of rendering techniques. We must loop through
        // all scopes and destroy them manually.
        var lastScope, nextScope, i = 0;
        each(scopes, function(s, index) {
            // listeners should be destroyed with the angular destroy.
            if (s) {
                s.$$prevSibling = lastScope || undefined;
                i = index;
                while (!nextScope && i < exp.rowsLength) {
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
    // destroy needs to put all watcher back before destroying or it will not destroy child scopes, or remove watchers.
    function destroy() {
        scope.datagrid = null;
        // we have a circular reference. break it on destroy.
        exp.log("destroying grid");
        clearTimeout(values.scrollingStopIntv);
        // destroy flow.
        flow.destroy();
        exp.flow = undefined;
        flow = null;
        // destroy watchers.
        while (unwatchers.length) {
            unwatchers.pop()();
        }
        exp.destroyLogger();
        // now remove every property on exports.
        for (var i in exp) {
            if (exp[i] && exp[i].hasOwnProperty("destroy")) {
                exp[i].destroy();
                exp[i] = null;
            }
        }
        //activate scopes so they can be destroyed by angular.
        destroyScopes();
        element.remove();
        // this seems to be the most memory efficient way to remove elements.
        exp = null;
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
    exports.logWrapper("datagrid", exp, "green");
    setupExports();
    return exp;
}

module.directive("uxDatagrid", [ "$compile", "addons", function($compile, addons) {
    return {
        restrict: "AE",
        link: function(scope, element, attr) {
            var inst = new Datagrid(scope, element, attr, $compile);
            scope.datagrid = inst;
            // expose to scope.
            each(exports.datagrid.coreAddons, function(method) {
                method.apply(inst, [ inst ]);
            });
            addons(inst, attr.addons);
            inst.start();
        }
    };
} ]);

/**
 * ChunkArray is an array with additional properties needed by the chunkModel to generate and access chunks
 * of the dom with high performance.
 * @constructor
 */
var ChunkArray = function() {};

ChunkArray.prototype = Array.prototype;

ChunkArray.prototype.min = 0;

ChunkArray.prototype.max = 0;

ChunkArray.prototype.templateStart = "";

ChunkArray.prototype.templateEnd = "";

ChunkArray.prototype.getStub = function getStub(str) {
    return this.templateStart + str + this.templateEnd;
};

/**
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

/**
 * chunkModel
 * Because the browser has low performance on dom elements that exist in high numbers and are all
 * siblings chunking is used to break them up into limits of their number and their parents and so on.
 * So think of it as every chunk not having more than X number of children weather those children be
 * chunks or they be rows.
 *
 * This speeds up the browser significantly because a resize event from a dom element will not affect
 * all of them, but just those direct siblings and then it's parents siblings and so on up the chain.
 *
 * @param exp
 * @returns {{}}
 */
exports.datagrid.coreAddons.chunkModel = function chunkModel(exp) {
    var _list, _rows, _chunkSize, _el, result = exports.logWrapper("chunkModel", {}, "purple", exp.dispatch);
    /**
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
                childAry.templateModel = exp.templateModel;
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
        ary.updateHeight(exp.templateModel, _rows);
        if (!ary.rendered) {
            ary.templateStart = ary.templateStart.substr(0, ary.templateStart.length - 1) + ' style="width:100%;height:' + ary.height + 'px;">';
        }
    }
    function updateAllChunkHeights(rowIndex) {
        var indexes = getRowIndexes(rowIndex, _list), ary = _list, index;
        while (indexes.length) {
            index = indexes.shift();
            if (ary[index] instanceof ChunkArray) {
                ary = ary[index];
            }
        }
        ary.updateHeight(exp.templateModel, _rows);
        updateChunkHeights(_el, _list, indexes);
    }
    function updateChunkHeights(el, ary) {
        var i = 0, len = ary.length;
        while (i < len) {
            if (ary.dirtyHeight) {
                ary.dirtyHeight = false;
                el.css({
                    height: ary.height + "px"
                });
                updateChunkHeights(angular.element(el.children()[i]), ary[i]);
            }
            i += 1;
        }
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
    exp.chunkModel = result;
    return result;
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.chunkModel);

exports.datagrid.events.RENDER_PROGRESS = "datagrid:renderProgress";

exports.datagrid.coreAddons.creepRenderModel = function creepRenderModel(exp) {
    var intv = 0, creepCount = 0, model = {}, upIndex = 0, downIndex = 0, time;
    function digest(index) {
        var s = exp.getScope(index);
        if (!s || !s.digested) {
            // just skip if already digested.
            exp.forceRenderScope(index);
        }
    }
    function calculatePercent() {
        var result = {
            count: 0
        };
        each(exp.scopes, calculateScopePercent, result);
        return {
            count: result.count,
            len: exp.rowsLength
        };
    }
    function calculateScopePercent(s, index, list, result) {
        result.count += s ? 1 : 0;
    }
    function onInterval(started, ended, force) {
        if (!exp.values.touchDown) {
            time = Date.now() + exp.options.renderThreshold;
            upIndex = started;
            downIndex = ended;
            render(onComplete, force);
        }
    }
    function wait(method, time) {
        var i, args = exports.util.array.toArray(arguments);
        args.splice(0, 2);
        if (exp.options.async) {
            exp.flow.remove(method);
            i = exp.flow.add(method, args, time);
        } else {
            method.apply(this, args);
        }
        return i;
    }
    function render(complete, force) {
        var changed = false, now = Date.now();
        if (time > now && (upIndex >= 0 || downIndex < exp.rowsLength)) {
            if (upIndex >= 0) {
                changed = force || !exp.isCompiled(upIndex);
                if (changed) digest(upIndex);
                upIndex -= 1;
            }
            if (downIndex < exp.rowsLength) {
                changed = force || changed || !exp.isCompiled(downIndex);
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
        if (!exp.values.speed && exp.scopes.length < exp.rowsLength) {
            resetInterval(upIndex, downIndex);
        }
        exp.dispatch(exports.datagrid.events.RENDER_PROGRESS, calculatePercent());
    }
    function stop() {
        time = 0;
        clearTimeout(intv);
        intv = 0;
    }
    function resetInterval(started, ended, waitTime, forceCompileRowRender) {
        stop();
        if (creepCount < exp.options.creepLimit) {
            intv = wait(onInterval, waitTime || exp.options.renderThresholdWait, started, ended, forceCompileRowRender);
        }
    }
    function renderLater(event, forceCompileRowRender) {
        resetInterval(upIndex, downIndex, 500, forceCompileRowRender);
    }
    function onBeforeRender(event) {
        creepCount = exp.options.creepLimit;
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
        exp = null;
        model = null;
    };
    exp.creepRenderModel = model;
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.BEFORE_VIRTUAL_SCROLL_START, onBeforeRender));
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.ON_VIRTUAL_SCROLL_UPDATE, onBeforeRender));
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.TOUCH_DOWN, onBeforeRender));
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.SCROLL_START, onBeforeRender));
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.AFTER_UPDATE_WATCHERS, onAfterRender));
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.creepRenderModel);

/*global ux */
exports.datagrid.coreAddons.normalizeModel = function normalizeModel(exp) {
    //TODO: this needs to be put on exp.normalizedModel
    var originalData, normalizedData, result = exports.logWrapper("normalizeModel", {}, "grey", exp.dispatch);
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
    exp.setData = function(data, grouped) {
        result.log("setData");
        originalData = data;
        if (grouped) {
            normalizedData = normalize(data, grouped);
        } else {
            normalizedData = data ? data.slice(0) : [];
        }
        return normalizedData;
    };
    exp.getData = function() {
        return normalizedData;
    };
    exp.getOriginalData = function() {
        return originalData;
    };
    /**
     * Get the normalized index for an item.
     * @param item
     * @param {Number=} startIndex
     */
    exp.getNormalizedIndex = function getNormalizedIndex(item, startIndex) {
        var i = startIndex || 0;
        while (i < exp.rowsLength) {
            if (exp.data[i] === item) {
                return i;
            }
            i += 1;
        }
        if (startIndex) {
            i = startIndex;
            while (i >= 0) {
                if (exp.data[i] === item) {
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
    exp.normalizeModel = result;
    return exp;
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.normalizeModel);

/*global ux */
exports.datagrid.events.SCROLL_START = "datagrid:scrollStart";

exports.datagrid.events.SCROLL_STOP = "datagrid:scrollStop";

exports.datagrid.events.TOUCH_DOWN = "datagrid:touchDown";

exports.datagrid.events.TOUCH_UP = "datagrid:touchUp";

exports.datagrid.coreAddons.scrollModel = function scrollModel(exp) {
    var result = exports.logWrapper("scrollModel", {}, "orange", exp.dispatch), setup = false, unwatchSetup;
    /**
     * Listen for scrollingEvents.
     */
    function setupScrolling() {
        if (!exp.element.css("overflow")) {
            exp.element.css({
                overflow: "auto"
            });
        }
        result.log("addScrollListener");
        exp.element[0].addEventListener("scroll", result.onUpdateScroll);
        addTouchEvents();
        setup = true;
        exp.flow.unique(result.onScrollingStop);
    }
    function addTouchEvents() {
        result.log("addTouchEvents");
        var content = exp.getContent();
        content.bind("touchstart", result.onTouchStart);
        content.bind("touchend", result.onTouchEnd);
        content.bind("touchcancel", result.onTouchEnd);
    }
    result.removeScrollListener = function removeScrollListener() {
        result.log("removeScrollListener");
        exp.element[0].removeEventListener("scroll", result.onUpdateScroll);
    };
    result.removeTouchEvents = function removeTouchEvents() {
        if (setup) {
            result.log("removeTouchEvents");
            exp.getContent().unbind("touchstart", result.onTouchStart);
            exp.getContent().unbind("touchend", result.onTouchEnd);
            exp.getContent().unbind("touchcancel", result.onTouchEnd);
        }
    };
    result.onTouchStart = function onTouchStart(event) {
        exp.values.touchDown = true;
        exp.dispatch(exports.datagrid.events.TOUCH_DOWN, event);
    };
    result.onTouchEnd = function onTouchEnd(event) {
        exp.values.touchDown = false;
        exp.dispatch(exports.datagrid.events.TOUCH_UP, event);
    };
    result.getScroll = function getScroll(el) {
        return (el || exp.element[0]).scrollTop;
    };
    result.setScroll = function setScroll(value) {
        exp.element[0].scrollTop = value;
        exp.values.scroll = value;
    };
    /**
     * When a scrollEvent is fired, recalculate the values.
     * @param event
     */
    result.onUpdateScroll = function onUpdateScroll(event) {
        var val = result.getScroll(event.target || event.srcElement);
        if (exp.values.scroll !== val) {
            exp.dispatch(exports.datagrid.events.SCROLL_START, val);
            exp.values.speed = val - exp.values.scroll;
            exp.values.absSpeed = Math.abs(exp.values.speed);
            exp.values.scroll = val;
            exp.values.scrollPercent = (exp.values.scroll / exp.getContentHeight() * 100).toFixed(2);
        }
        result.waitForStop();
        exp.dispatch(exports.datagrid.events.ON_SCROLL, exp.values);
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
        exp.flow.remove(result.onScrollingStop);
    };
    /**
     * Wait for the datagrid to slow down enough to render.
     */
    result.waitForStop = function waitForStop() {
        if (exp.flow.async || exp.values.touchDown) {
            exp.flow.add(result.onScrollingStop, null, exp.options.updateDelay);
        } else {
            exp.flow.add(result.onScrollingStop);
        }
    };
    /**
     * When it stops render.
     */
    result.onScrollingStop = function onScrollingStop() {
        exp.values.speed = 0;
        exp.values.absSpeed = 0;
        exp.flow.add(exp.render);
        exp.dispatch(exports.datagrid.events.SCROLL_STOP, exp.values.scroll);
    };
    /**
     * Scroll to the normalized index.
     * @param index
     * @param {Boolean=} immediately
     */
    result.scrollToIndex = function scrollToIndex(index, immediately) {
        result.log("scrollToIndex");
        var offset = exp.getRowOffset(index);
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
        var index = exp.getNormalizedIndex(item);
        if (index !== -1) {
            return result.scrollToIndex(index, immediately);
        }
        return exp.values.scroll;
    };
    /**
     * If the item is above or below the viewable area, scroll till it is in view.
     * @param itemOrIndex
     * @param immediately
     */
    result.scrollIntoView = function scrollIntoView(itemOrIndex, immediately) {
        result.log("scrollIntoView");
        var index = typeof itemOrIndex === "number" ? itemOrIndex : exp.getNormalizedIndex(itemOrIndex), offset = exp.getRowOffset(index), rowHeight, viewHeight;
        if (offset < exp.values.scroll) {
            // it is above the view.
            result.scrollTo(offset, immediately);
            return;
        }
        viewHeight = exp.getViewportHeight();
        rowHeight = exp.templateModel.getTemplateHeight(exp.getData()[index]);
        if (offset >= exp.values.scroll + viewHeight - rowHeight) {
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
        var value = exp.getContentHeight() - exp.getViewportHeight();
        result.scrollTo(value >= 0 ? value : 0, immediately);
    };
    function destroy() {
        result.destroyLogger();
        unwatchSetup();
        if (setup) {
            result.removeScrollListener();
            result.removeTouchEvents();
        }
    }
    /**
     * Wait till the grid is ready before we setup our listeners.
     */
    unwatchSetup = exp.scope.$on(exports.datagrid.events.READY, setupScrolling);
    result.destroy = destroy;
    exp.scrollModel = result;
    // all models should try not to pollute the main model to keep it clean.
    return exp;
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.scrollModel);

/*global angular */
exports.datagrid.coreAddons.templateModel = function templateModel(exp) {
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
    exp.templateModel = function() {
        var templates = [], totalHeight, defaultName = "default", result = exports.logWrapper("templateModel", {}, "teal", exp.dispatch);
        function createTemplates() {
            result.log("createTemplates");
            var i, scriptTemplates = exp.element[0].getElementsByTagName("script"), len = scriptTemplates.length;
            if (!len) {
                throw new Error("at least one template is required.");
            }
            for (i = 0; i < len; i += 1) {
                createTemplate(scriptTemplates[i]);
            }
            while (scriptTemplates.length) {
                exp.element[0].removeChild(scriptTemplates[0]);
            }
        }
        function createTemplate(scriptTemplate) {
            var template = trim(angular.element(scriptTemplate).html()), wrapper = document.createElement("div"), name = scriptTemplate.attributes["data-template-name"].nodeValue || defaultName, templateData;
            template = angular.element(template)[0];
            template.className += " " + exp.options.uncompiledClass + " {{$status}}";
            template.setAttribute("template", name);
            exp.getContent()[0].appendChild(wrapper);
            wrapper.appendChild(template);
            template = trim(wrapper.innerHTML);
            wrapper.childNodes[0].style.lineHeight = "0px";
            // make so lineHeight doesn't wrap and affect template size.
            templateData = {
                name: name,
                item: scriptTemplate.attributes["data-template-item"].nodeValue,
                template: template,
                height: wrapper.offsetHeight
            };
            result.log("template: %s %o", name, templateData);
            if (!templateData.height) {
                throw new Error("Template height cannot be 0.");
            }
            templates[templateData.name] = templateData;
            templates.push(templateData);
            exp.getContent()[0].removeChild(wrapper);
            totalHeight = 0;
            // reset cached value.
            return templateData;
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
            var item = typeof itemOrIndex === "number" ? exp.data[itemOrIndex] : itemOrIndex;
            var oldTemplate = result.getTemplate(item).name;
            result.setTemplateName(item, newTemplateName);
            exp.dispatch(exports.datagrid.events.ON_ROW_TEMPLATE_CHANGE, item, oldTemplate, newTemplateName);
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
        result.destroy = destroy;
        return result;
    }();
    return exp.templateModel;
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.templateModel);
}(this.ux = this.ux || {}, function() {return this;}()));
