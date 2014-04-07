/*
* uxRunner v.0.1.0
* (c) 2014, WebUX
* License: MIT.
*/
(function(exports, global){
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

(function(exports, global) {
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
        } else if (!(list instanceof Array)) {
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
    exports.file = exports.file || {};
    exports.file.getContents = function(url, asyncCallback, method, win) {
        var xmlhttp;
        win = win || window;
        if (win.XMLHttpRequest) {
            xmlhttp = new XMLHttpRequest();
        }
        xmlhttp.open(method || "GET", url, !!asyncCallback);
        xmlhttp.send();
        if (!asyncCallback) {
            return xmlhttp.responseText;
        } else {
            throw new Error("Incomplete");
        }
    };
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
    function sort(ary, compareFn) {
        var c, len, v, rlen, holder;
        if (!compareFn) {
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
    exports.selector = function() {
        var omitAttrs, uniqueAttrs, classFilters, classFiltersFctn, api;
        function query(selectorStr, el) {
            el = el || api.config.doc.body;
            var rx = /:eq\((\d+)\)$/, match = selectorStr.match(rx), result, count;
            if (match && match.length) {
                selectorStr = selectorStr.replace(rx, "");
                count = match[1];
            }
            result = el.querySelectorAll(selectorStr);
            if (result && count !== undefined) {
                return result[count];
            }
            return result;
        }
        function getCleanSelector(el, ignoreClass) {
            if (validateEl(el)) {
                var ignore = buildIgnoreFunction(ignoreClass), matches, index, str, maxParent = api.config.doc.body, selector = getSelectorData(el, maxParent, ignore, null, true);
                while (selector.count > selector.totalCount) {
                    selector = selector.parent;
                }
                selector = selector.parent || selector;
                str = selector.str || selectorToString(selector);
                if (selector.str) {
                    var child = selector.child;
                    while (child) {
                        str += " " + child.str;
                        child = child.child;
                    }
                }
                if (selector.count > 1 || selector.child && selector.child.count) {
                    matches = exports.util.array.toArray(query(str, maxParent));
                    index = matches.indexOf(el);
                    str += ":eq(" + index + ")";
                }
                str += getVisible();
                return str;
            }
            return "";
        }
        function quickSelector(element, maxParent, ignoreClass) {
            if (validateEl(element)) {
                var ignore = buildIgnoreFunction(ignoreClass), selector = getSelectorData(element, maxParent, ignore);
                return selectorToString(selector) + getVisible();
            }
            return "";
        }
        function validateEl(el) {
            if (!el) {
                return "";
            }
            if (el && el.length) {
                throw new Error("selector can only build a selection to a single DOMElement. A list was passed.");
            }
            return true;
        }
        function getVisible() {
            return api.config.addVisible ? ":visible" : "";
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
                type: element.nodeName && element.nodeName.toLowerCase() || "",
                child: child
            };
            if (!result.attributes.$unique || child) {
                if (smartSelector) {
                    result.str = selectorToString(result, 0, null, true);
                    result.count = maxParent.querySelectorAll(result.str).length;
                    if (result.count > 1) {
                        result.parent = getParentSelector(element, maxParent, ignoreClass, result, smartSelector);
                    }
                } else {
                    result.parent = getParentSelector(element, maxParent, ignoreClass, result, smartSelector);
                }
            }
            return result;
        }
        function filterNumbers(item) {
            return typeof item !== "number";
        }
        function buildIgnoreFunction(ignoreClasses) {
            ignoreClasses = ignoreClasses || [];
            if (typeof ignoreClasses === "function") {
                return ignoreClasses;
            }
            return function(cls) {
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
            return "[" + attr.name + "='" + escapeQuotes(attr.value) + "']";
        }
        function getUniqueAttribute(attributes) {
            var attr, i = 0, len = attributes ? attributes.length : 0;
            while (i < len) {
                attr = attributes[i];
                if (uniqueAttrs[attr.name]) {
                    return attr;
                }
                i += 1;
            }
            return null;
        }
        function camelCase(name) {
            var ary, i = 1, len;
            if (name.indexOf("-")) {
                ary = name.split("-");
                len = ary.length;
                while (i < len) {
                    ary[i] = ary[i].charAt(0).toUpperCase() + ary[i].substr(1);
                    i += 1;
                }
                name = ary.join("");
            }
            return name;
        }
        function escapeQuotes(str) {
            return str.replace(/"/g, "&quot;").replace(/'/g, "&apos;");
        }
        function selectorToString(selector, depth, overrideMaxParent, skipCount) {
            var matches, str, parent;
            depth = depth || 0;
            str = selector && !selector.attributes.$unique ? selectorToString(selector.parent, depth + 1) : "";
            if (selector) {
                str += (str.length ? " " : "") + getSelectorString(selector);
            }
            if (!depth && !skipCount) {
                parent = overrideMaxParent || selector.maxParent;
                matches = parent.querySelectorAll && parent.querySelectorAll(str) || [];
                if (matches.length > 1) {
                    str += ":eq(" + getIndexOfTarget(matches, selector.element) + ")";
                }
            }
            return str;
        }
        function getSelectorString(selector) {
            if (selector.attributes.$unique) {
                return selector.attributes[0];
            }
            return selector.type + selector.attributes.join("") + (selector.classes.length ? "." + selector.classes.join(".") : "");
        }
        function getParentSelector(element, maxParent, ignoreClass, child, detailed) {
            var parent = element.parentNode;
            if (parent && parent !== maxParent) {
                return getSelectorData(element.parentNode, maxParent, ignoreClass, child, detailed);
            }
            return null;
        }
        function getIndexOfTarget(list, element) {
            var i, iLen = list.length;
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
                if (obj.hasOwnProperty(i)) {
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
            query: query,
            addOmitAttrs: function(name) {
                exports.each(arguments, function(name) {
                    omitAttrs[name] = true;
                });
                return this;
            },
            removeOmitAttrs: function(name) {
                exports.each(arguments, function(name) {
                    delete omitAttrs[name];
                });
                return this;
            },
            getOmitAttrs: function() {
                return getList(omitAttrs);
            },
            resetOmitAttrs: function() {
                omitAttrs = {
                    "class": true,
                    style: true
                };
            },
            addUniqueAttrs: function(name) {
                exports.each(arguments, function(name) {
                    uniqueAttrs[name] = true;
                });
                return this;
            },
            removeUniqueAttrs: function(name) {
                exports.each(arguments, function(name) {
                    delete uniqueAttrs[name];
                });
                return this;
            },
            getUniqueAttrs: function() {
                return getList(uniqueAttrs);
            },
            resetUniqueAttrs: function() {
                uniqueAttrs = {
                    id: true,
                    uid: true
                };
            },
            addClassOmitFilters: function() {
                exports.each(arguments, function(filter) {
                    classFilters.push(filter);
                });
                classFiltersFctn = buildIgnoreFunction(classFilters);
                return this;
            },
            removeClassOmitFilters: function() {
                exports.each(arguments, function(filter) {
                    var index = classFilters.indexOf(filter);
                    if (index !== -1) {
                        classFilters.splice(index, 1);
                    }
                });
                classFiltersFctn = buildIgnoreFunction(classFilters);
                return this;
            },
            getClassOmitFilters: function() {
                return classFilters.slice(0);
            },
            resetClassOmitFilters: function() {
                classFilters = [];
                classFiltersFctn = buildIgnoreFunction(classFilters);
            },
            get: getCleanSelector,
            getCleanSelector: getCleanSelector,
            quickSelector: quickSelector,
            reset: function() {
                api.resetOmitAttrs();
                api.resetUniqueAttrs();
                api.resetClassOmitFilters();
            }
        };
        api.reset();
        return api;
    }();
})(this.ux = this.ux || {}, function() {
    return this;
}());

function toArray(obj) {
    var result = [], i = 0, len = obj.length;
    while (i < len) {
        result.push(obj[i]);
        i += 1;
    }
    return result;
}

exports.util = exports.util || {};

exports.util.array = exports.util.array || {};

exports.util.array.toArray = toArray;

var module = {}, runner, locals = {}, events = {
    START: "runner:start",
    STEP_START: "runner:stepStart",
    STEP_UPDATE: "runner:stepUpdate",
    STEP_END: "runner:stepEnd",
    STEP_PAUSE: "runner:stepPause",
    DONE: "runner:done"
}, options = {
    async: true,
    interval: 100,
    chainInterval: 10,
    defaultTimeout: 1e3,
    frame: {
        top: 0,
        left: 0,
        width: "100%",
        height: "100%"
    },
    timeouts: {
        mini: 100,
        "short": 1e3,
        medium: 1e4,
        "long": 3e4,
        forever: 6e4
    }
}, states = {
    DORMANT: "dormant",
    RUNNING: "running",
    COMPLETE: "complete"
}, types = {
    ROOT: "root",
    SCENARIO: "scenario",
    SCENE: "scene",
    STEP: "step"
}, injector, all, activeStep, intv, scenarios = [], walkStep = null, describeOnly = false, descriptions = [], lastStartArguments = [];

if (!Math.uuid) {
    var c = 0;
    Math.uuid = function uuid() {
        c += 1;
        var str = c.toString(36).toUpperCase();
        while (str.length < 6) {
            str = "0" + str;
        }
        return str;
    };
}

function log(message) {
    if (runner.debug) {
        console.log.apply(console, arguments);
    }
}

function dispatch(event) {
    if (runner.dispatcher) {
        runner.dispatcher.dispatch.apply(runner.dispatcher, arguments);
    } else {
        runner.dispatch.apply(runner, arguments);
    }
}

function setupValues() {
    options.window = options.window || window;
    options.rootElement = options.rootElement || $(options.window.document);
    injector = runner.getInjector && runner.getInjector() || {
        invoke: invoke
    };
    runner.locals.injector = injector;
    runner.locals.$ = function(selection) {
        var win = runner.options.window;
        return win.$ ? win.$(selection) : $(selection);
    };
    $.extend(runner.locals.$, $);
}

function init() {
    setupValues();
    runner.walking = false;
    runner.exit = false;
    applyInPageMethods();
}

function loadJSFile(win, src) {
    var xmlhttp;
    if (win.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    }
    xmlhttp.open("GET", src, false);
    xmlhttp.send();
    var se = win.document.createElement("script");
    se.type = "text/javascript";
    se.text = xmlhttp.responseText;
    win.document.getElementsByTagName("body")[0].appendChild(se);
}

function forceJQueryLoad() {
    var win = runner.options.window;
    if (!win.$ && win.angular.element) {
        for (var i in $.prototype) {
            win.angular.element.prototype[i] = $.prototype[i];
        }
    }
    if (!win.$) {
        loadJSFile(win, "//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.0/jquery.min.js");
    }
}

function applyInPageMethods() {
    forceJQueryLoad();
    if (runner.inPageMethods.length) {
        each(runner.inPageMethods, function(method) {
            method.apply(runner.options.window, []);
        });
        runner.inPageMethods.length = 0;
    }
}

function setup() {
    var config = {
        name: "all",
        type: types.ROOT,
        label: "E2E Tests",
        parent: {
            type: types.ROOT,
            depth: 0,
            next: function() {
                log("All Complete");
                dispatch(events.DONE);
            }
        }
    };
    all = step(config);
    config.depth = 0;
    activeStep = all;
}

function charPack(char, len) {
    var str = "";
    while (str.length < len) {
        str += char;
    }
    return str;
}

function each(list, method, data) {
    var i = 0, len, result;
    if (list.length) {
        len = list.length;
        while (i < len) {
            result = method(list[i], i, list, data);
            if (result !== undefined) {
                return result;
            }
            i += 1;
        }
    } else {
        for (i in list) {
            if (list.hasOwnProperty(i)) {
                result = method(list[i], i, list, data);
                if (result !== undefined) {
                    return result;
                }
            }
        }
    }
    return list;
}

function step(exports) {
    var steps = [], index = 0, childStep, exit = false, exitMessage = "", targetParentTypes = [ types.SCENARIO, types.ROOT ];
    if (exports.type === types.ROOT) {
        targetParentTypes = [ types.ROOT ];
    } else if (exports.type === types.STEP) {
        targetParentTypes = [ types.SCENE, types.STEP ];
    }
    while (exports.parent && targetParentTypes.indexOf(exports.parent.type) === -1) {
        exports.parent = exports.parent.parent;
    }
    if (!exports.parent && exports.type !== types.ROOT) {
        runner.exit = exports.exit = exit = true;
        exitMessage = "Unable find step parent. Most likely caused by improper organization. Such as adding a find inside a scenario instead of inside a step.";
    }
    function add(step) {
        steps.push(step);
    }
    function run() {
        exports.state = states.RUNNING;
        activeStep = exports;
        exports.startTime = Date.now();
        if (exports.parent) {
            exports.exit = exit = exports.parent.exit;
            exitMessage = "(EXIT: exit inherited.)";
        }
        if (exports.parent && exports.parent.element) {
            exports.element = exports.parent.element;
        }
        dispatch(events.STEP_START, exports);
        log("%sRUN:%s: %s", charPack("	", exports.depth), exports.type, exports.label);
        finalize();
        return exports;
    }
    function next() {
        if (runner.walking) {
            dispatch(events.STEP_UPDATE, exports);
        }
        childStep = steps[index];
        if (childStep) {
            index += 1;
            childStep.run();
            return;
        }
        complete();
    }
    function complete() {
        if (exports.state !== states.COMPLETE) {
            exports.state = states.COMPLETE;
            log("%sCOMPLETE:%s: %s", charPack("	", exports.depth), exports.type, exports.label);
            dispatch(events.STEP_END, exports);
        }
        if (exports.onComplete) exports.onComplete();
        exports.parent.next();
    }
    function exec(method) {
        return injector.invoke(method, exports, locals);
    }
    function validate(method) {
        if (method) {
            return !!exec(method);
        }
        return true;
    }
    function finalize() {
        if (exit) {
            exports.label += "(EXIT: " + exitMessage + ")";
            exports.pass = false;
            exports.repeat = 0;
        } else {
            if (describeOnly) {
                descriptions.push({
                    label: exports.label,
                    type: exports.type
                });
                exports.repeat = 0;
            }
            if (describeOnly && (exports.type === types.STEP || exports.type === types.SCENE)) {
                exports.pass = true;
            } else {
                try {
                    exec(exports.method);
                    exports.pass = describeOnly ? true : validate(exports.validate);
                } catch (e) {
                    exports.pass = describeOnly || false;
                    exports.label += " ERROR: " + e.message;
                    console.error(e.message);
                }
            }
        }
        exports.count += 1;
        exports.timedOut = !hasTimeLeft(exports);
        if (exports.repeat > exports.count && !exports.pass && !exports.timedOut) {
            log("%s%s: checking %s", charPack("	", exports.depth), exports.type, exports.label);
            clearTimeout(intv);
            dispatch(events.STEP_UPDATE, exports);
            createInterval(exports, finalize);
        } else {
            log('%s%s: %s, value:"%s" (%s)', charPack("	", exports.depth), exports.type, exports.label, exports.value, exports.pass ? "pass" : "fail");
            walkStep = exports;
            if (runner.pauseOnFail && !exports.pass) {
                pause();
                dispatch(events.STEP_UPDATE, exports);
            }
            if (runner.walking) {
                dispatch(events.STEP_PAUSE, exports);
                return;
            } else {
                clearTimeout(intv);
                dispatch(events.STEP_UPDATE, exports);
                createInterval(exports, next);
            }
        }
    }
    function createInterval(exports, callback) {
        if (options.async) {
            if (exports.type === types.STEP && exports.steps && exports.steps.length) {
                intv = setTimeout(callback, options.chainInterval);
            } else {
                intv = setTimeout(callback, options.interval);
            }
        } else {
            callback();
        }
    }
    function custom(label, method, validate, timeout) {
        method = method || function() {};
        var s = {
            type: types.STEP,
            parentType: types.STEP,
            repeat: 1,
            label: label || "CUSTOM",
            value: undefined,
            method: function() {
                s.element = exports.element;
                s.value = s.exec(method);
                return s;
            },
            validate: function() {
                if (typeof validate === "boolean") {
                    return validate;
                }
                return validate ? s.exec(validate) : true;
            },
            timeout: timeout || options.interval
        };
        createElementStep(s, s.parent);
        return s;
    }
    function until(label, validate, timeout) {
        var s = {
            type: types.STEP,
            parentType: types.STEP,
            repeat: 1,
            label: label || "UNTIL",
            value: undefined,
            method: function() {
                s.element = exports.element;
                return s;
            },
            validate: function() {
                var result = validate ? s.exec(validate) : true;
                if (hasTimeLeft(s) && !result) {
                    s.repeat += 1;
                }
                return result;
            },
            timeout: timeout || options.interval
        };
        createElementStep(s, s.parent);
        return s;
    }
    function done() {
        exports.isDone = true;
        exports.repeat = 0;
    }
    exports.id = Math.uuid();
    exports.state = states.DORMANT;
    exports.type = exports.type || types.STEP;
    exports.label = exports.label || "no label";
    exports.timeout = exports.timeout || options.defaultTimeout;
    exports.method = exports.method || function() {};
    exports.validate = exports.validate || function() {
        return true;
    };
    exports.repeat = exports.repeat || 1;
    exports.count = 0;
    exports.add = add;
    exports.run = run;
    exports.next = next;
    exports.custom = custom;
    exports.until = until;
    exports.done = done;
    exports.exec = exec;
    exports.steps = steps;
    exports.depth = exports.parent ? exports.parent.depth + 1 : 0;
    return exports;
}

step.DORMANT = 0;

step.RUNNING = 1;

step.COMPLETE = 2;

function create(params) {
    params.type = params.type || types.STEP;
    params.parent = params.parent || activeStep;
    params.parent.add(step(params));
    return params;
}

function createElementStep(params, parent) {
    params.type = types.STEP;
    params.parent = parent || activeStep;
    create(params);
    addJQ(params);
    return params;
}

function scenario(label, method) {
    create({
        type: types.SCENARIO,
        parentType: types.SCENARIO,
        label: label,
        method: method
    });
}

function scene(label, method, validate, timeout) {
    create({
        type: types.SCENE,
        parentType: types.SCENARIO,
        label: label,
        method: method,
        validate: validate,
        timeout: timeout
    });
}

function assert(label, validate) {
    var params = {
        type: activeStep.type === types.STEP || activeStep.type === types.SCENE ? types.STEP : types.SCENE,
        parentType: activeStep.type,
        label: label,
        method: function() {},
        validate: validate
    };
    return activeStep.type === types.STEP ? createElementStep(params, activeStep) : create(params);
}

function wait(timeout) {
    timeout = timeout || options.interval;
    create({
        type: types.STEP,
        parentType: types.SCENE,
        label: "wait " + timeout + "ms",
        method: null,
        repeat: 1e4,
        validate: function() {
            return !hasTimeLeft(this, true);
        },
        timeout: timeout
    });
}

function waitFor(label, fn, timeout) {
    create({
        type: types.STEP,
        parentType: types.SCENE,
        label: "wait for " + label,
        method: null,
        repeat: 1e4,
        validate: fn,
        timeout: timeout
    });
}

function waitForNgEvent(event, timeout) {
    var s = {
        type: types.STEP,
        parentType: types.SCENE,
        label: 'wait for "' + event + '" event.',
        repeat: 1e4,
        scope: null,
        method: function() {
            if (!s.scope) {
                s.element = s.parent.element || options.rootElement;
                s.scope = s.element.scope();
                s.scope.$on(event, function() {
                    s.ngEvent = true;
                });
            }
        },
        validate: function() {
            return !!s.ngEvent;
        },
        timeout: timeout || options.timeouts.short
    };
    create(s);
}

function hasTimeLeft(s, stepBefore) {
    return s.timeout + s.startTime - (stepBefore ? options.interval : 0) > Date.now();
}

function chainMethodPreExec(step, el, name, args) {
    if (name === "trigger") {
        step.label = 'trigger "' + args[0].toUpperCase() + '"';
    }
}

function jqMethod(target, name, validate) {
    return function() {
        var args = arguments, s = {
            label: name.toUpperCase(),
            value: undefined,
            timeout: options.interval,
            method: function() {
                var el = s.element;
                if (el) {
                    if (!el[name]) {
                        throw new Error('Method "' + name + '" is not supported yet.');
                    }
                    chainMethodPreExec(s, el, name, args);
                    el[name].apply(el, args);
                    if (validate) {
                        s.value = el[name].apply(el, []);
                    }
                }
                return s;
            },
            validate: function() {
                if (!s.element || !s.element.length) {
                    return false;
                }
                if (validate && args.length) {
                    return s.value === args[0];
                }
                return true;
            }
        };
        createElementStep(s, target);
        return s;
    };
}

function addJQ(target) {
    createJqMethods(target);
    createJqAccessors(target);
    each(runner.elementMethods, addElementMethods, target);
}

function createJqMethods(target) {
    var i = 0, len = runner.jqMethods.length;
    while (i < len) {
        target[runner.jqMethods[i]] = jqMethod(target, runner.jqMethods[i]);
        i += 1;
    }
}

function createJqAccessors(target) {
    var i = 0, len = runner.jqAccessors.length;
    while (i < len) {
        target[runner.jqAccessors[i]] = jqMethod(target, runner.jqAccessors[i], true);
        i += 1;
    }
}

function addElementMethods(stepData, index, list, target) {
    if (typeof stepData === "function") {
        stepData(target);
    } else {
        target[stepData.name] = stepData.method(target);
    }
}

function find(selector, timeout, label) {
    var selectorLabel = typeof selector === "function" ? "(custom method)" : selector;
    label = label || 'find: "' + selectorLabel + '"';
    var s = {
        type: types.STEP,
        parentType: types.SCENE,
        repeat: 1e4,
        label: label,
        value: undefined,
        method: function() {
            s.value = s.element = options.rootElement.find(typeof selector === "function" ? s.exec(selector) : selector);
            return s;
        },
        validate: function() {
            var result = !!s.value.length;
            s.label = result ? label : "could not find" + ' "' + selectorLabel + '"';
            return result;
        },
        timeout: timeout
    };
    createElementStep(s);
    return s;
}

function invoke(fn, scope, locals) {
    var injectables = getInjectables(fn, locals);
    return fn.apply(scope, injectables.args);
}

function getInjectables(fn, locals) {
    var str = fn.toString(), result = {
        map: {},
        args: [],
        locals: locals
    }, list, params = str.match(/\(.*\)/)[0].match(/([\$\w])+/gm);
    if (params && params.length) {
        each(params, addInjection, result);
    }
    return result;
}

function addInjection(name, index, list, data) {
    data.map[name] = data.locals[name] || window[name];
    data.args.push(data.map[name]);
}

function addScenario(name, scenario) {
    scenarios.push({
        name: name,
        scenario: scenario
    });
    return scenario;
}

function clearScenarios() {
    scenarios.length = 0;
    runner.scenarios = {};
}

function applyConfig(config) {
    runner.options = $.extend(options, config);
}

function getScenarioNames() {
    var ary = [];
    each(scenarios, function(sc) {
        ary.push(sc.name);
    });
    return ary;
}

function getScenario(name) {
    name = name.toLowerCase();
    return each(scenarios, function(sc) {
        if (sc.name.toLowerCase() === name) {
            return sc;
        }
    });
}

function runScenario(scenario) {
    scenario = typeof scenario !== "string" ? scenario : getScenario(scenario);
    create({
        type: types.SCENARIO,
        parentType: types.ROOT,
        label: "SCENARIO: " + scenario.name,
        method: scenario.scenario
    });
}

function runAll() {
    var i = 0, len = scenarios.length;
    while (i < len) {
        runScenario(scenarios[i]);
        i += 1;
    }
}

function run(scenarioName) {
    lastStartArguments = arguments;
    if (runner.stop) runner.stop();
    init();
    if (!describeOnly && runner.onStart) runner.onStart();
    dispatch(events.START);
    log("run");
    setup();
    if (scenarioName) {
        each(arguments, runScenario);
    } else {
        runAll();
    }
    activeStep.run();
}

function restart() {
    run.apply(this, lastStartArguments);
}

function walk(scenarioName) {
    run.apply(runner, arguments);
    pause();
}

function forceStep() {
    walkStep.next();
}

function pause() {
    runner.walking = true;
}

function resume() {
    runner.walking = false;
    forceStep();
}

function repeat(method, times) {
    var i = 0, args = exports.util.array.toArray(arguments);
    args.shift();
    args.shift();
    while (i < times) {
        method.apply({}, [ i ].concat(args));
        i += 1;
    }
}

function repeatUntil(fn, count, parent, addAfter) {
    count = count || 0;
    parent = parent || activeStep;
    var doneExecuted = false, done = function() {
        doneExecuted = true;
    }, params = {
        type: types.SCENE,
        parentType: types.SCENARIO,
        label: "repeatUntil",
        parent: parent,
        method: function() {},
        validate: function() {
            injector.invoke(fn, params, $.extend({
                count: count,
                done: done
            }, locals));
            if (doneExecuted && params.label === "repeatUntil") {
                params.label = "repeatUntil - END";
            }
            return params.pass !== undefined ? params.pass : true;
        },
        onComplete: function() {
            if (describeOnly) {
                doneExecuted = true;
            }
            if (!doneExecuted) {
                repeatUntil(fn, count + 1, parent, params);
            }
        },
        timeout: options.interval
    };
    params.type = params.type || types.STEP;
    params.parent = params.parent || activeStep;
    if (addAfter) {
        parent.steps.splice(parent.steps.indexOf(addAfter) + 1, 0, step(params));
    } else {
        parent.add(step(params));
    }
    params.done = done;
}

function describeScenario(scenarioName) {
    var async = options.async;
    descriptions = [];
    describeOnly = true;
    options.async = false;
    run(scenarioName);
    describeOnly = false;
    options.async = async;
    return descriptions;
}

function describeScenarios(callback) {
    var result = [];
    describeTheRest(scenarios.slice(0), result, callback);
    return result;
}

function describeTheRest(remaining, result, callback) {
    var desc = describeScenario(remaining.shift());
    desc.shift();
    each(desc, function(item) {
        result.push(item);
    });
    if (remaining.length) {
        setTimeout(describeTheRest, 0, remaining, result, callback);
    }
    if (callback) {
        callback(result, remaining.length);
    }
}

runner = {
    getInjector: null,
    compact: true,
    debug: false,
    config: applyConfig,
    exit: false,
    restart: restart,
    run: run,
    walk: walk,
    walking: false,
    pauseOnFail: true,
    next: forceStep,
    pause: pause,
    resume: resume,
    addScenario: addScenario,
    clearScenarios: clearScenarios,
    getScenarioNames: getScenarioNames,
    describeScenario: describeScenario,
    describeScenarios: describeScenarios,
    types: types,
    events: events,
    states: states,
    createStep: create,
    createElementStep: createElementStep,
    elementMethods: [],
    scenarios: {},
    locals: locals,
    $: null,
    dispatcher: null,
    each: each,
    repeat: repeat,
    inPageMethods: [],
    jqMethods: [ "focus", "blur", "click", "mousedown", "mouseover", "mouseup", "select", "touchstart", "touchend", "trigger", "hasClass", "closest", "find" ],
    jqAccessors: [ "val", "text", "html", "scrollTop","height","width"]
};

locals.scenario = scenario;

locals.repeatUntil = repeatUntil;

locals.scene = scene;

locals.assert = assert;

locals.find = find;

locals.options = options;

locals.wait = wait;

locals.waitFor = waitFor;

locals.waitForNgEvent = waitForNgEvent;

locals.repeat = repeat;

dispatcher(runner);

exports.runner = runner;

$("body").ready(function() {
    if (runner.options && runner.options.autoStart) {
        if (typeof runner.options.autoStart === "function") {
            setupValues();
            runner.options.autoStart.apply(runner, []);
        } else {
            setTimeout(runner.run, 1e3);
        }
    }
});

function renderer() {
    var exports = {}, overlay, content, isMouseDown = false, highlighter, highlightContainer, toolTip, lastStep, passed, failed, plusMinusIncrement = 10;
    function killEvent(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
    function start(event) {
        if ($(".runner-overlay").length) {
            stop();
        }
        passed = 0;
        failed = 0;
        overlay = $('<div class="runner-overlay">' + '<div class="runner-title">RUNNER ' + '<div class="runner-button-bar">' + '<a href="javascript:void(0)" class="runner-close runner-button" title="Close Runner">X</a> ' + '<a href="javascript:void(0)" class="runner-restart runner-button" title="Restart last run">&#x21bb;</a> ' + '<a href="javascript:void(0)" class="runner-pause runner-button" title="Pause Runner">||</a> ' + '<a href="javascript:void(0)" class="runner-next runner-button" title="Step Forward">&#x25B6;|</a> ' + '<a href="javascript:void(0)" class="runner-resume runner-button" title="Resume">&#x25B6;</a> ' + '<span class="runner-interval-label">Speed:</span><input type="text" class="runner-interval" disabled> ' + '<a href="javascript:void(0)" class="runner-plus runner-button" title="Increase Speed">+</a> ' + '<a href="javascript:void(0)" class="runner-minus runner-button" title="Decrease Speed">-</a> ' + '<a href="javascript:void(0)" class="runner-details runner-button" title="Click to show or hide details.">?</a> ' + '<a href="javascript:void(0)" class="runner-minimize runner-button" title="Click to minimize the runner.">_</a> ' + "</div>" + ' <a href="javascript:void(0)" class="runner-complete"></a> ' + "</div>" + '<div class="runner-clear"></div>' + '<div class="runner-scroller">' + '<div class="runner-content' + (runner.compact ? " compact" : "") + '">' + '<div class="runner-content-title-spacer"></div>' + "</div>" + "</div>" + '<div class="runner-highlight-container"></div>' + "</div>");
        content = overlay.find(".runner-content");
        overlay.click(killEvent);
        overlay.mousedown(function() {
            isMouseDown = true;
        });
        overlay.mouseup(function() {
            isMouseDown = false;
        });
        $(document).blur(function(event) {
            if (isMouseDown) {
                killEvent(event);
            }
        });
        highlighter = $('<div class="runner-highlighter"></div>');
        toolTip = $('<div class="runner-tooltip"><div class="runner-tooltip-arrow"></div><div class="runner-tooltip-content"></div></div>');
        $("body").append(overlay);
        highlightContainer = $(".runner-highlight-container");
        highlightContainer.append(highlighter);
        highlightContainer.append(toolTip);
        updateHighlightContainer();
        addBinds();
    }
    function updateResume() {
        if (ux.runner.walking) {
            $(".runner-resume").removeClass("unpaused").addClass("paused");
        } else {
            $(".runner-resume").removeClass("paused").addClass("unpaused");
        }
    }
    function updateSpeed() {
        $(".runner-interval").val(ux.runner.options.interval);
    }
    function updateHighlightContainer() {
        var frame = $("#targetFrame"), data;
        if (frame.length) {
            if (runner.options.frame) {
                frame.css(runner.options.frame);
            }
            data = frame.offset();
            data.position = "absolute";
            data.width = frame.width();
            data.height = frame.height();
            highlightContainer.css(data);
        } else {
            highlightContainer.css({
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%"
            });
        }
    }
    function updateHighlight(step) {
        var el = step.element;
        updateResume();
        updateSpeed();
        updateHighlightContainer();
        writeLabel(step, false, toolTip.find(".runner-tooltip-content"));
        if (el && el.length && el.offset()) {
            var pos = el.offset();
            highlighter.removeClass("runner-highlighter-empty");
            highlighter.css({
                top: pos.top,
                left: pos.left,
                width: el.width(),
                height: el.height()
            });
            toolTip.css({
                top: pos.top + el.height(),
                left: pos.left + el.width() - toolTip.width()
            });
        } else {
            highlighter.addClass("runner-highlighter-empty");
        }
    }
    function isChainStep(step) {
        return step && step.type === ux.runner.types.STEP;
    }
    function writeLabel(step, paused, el) {
        var isChain = isChainStep(step.parent) && isChainStep(step);
        el.html((isChain && " - " || "") + '<span class="runner-step-label">' + step.label + "</span>" + (step.count > 1 ? ' <span class="runner-step-count" title="repeat count">' + step.count + "</span>" : "") + (step.timedOut ? ' <span class="runner-timed-out" title="timeout">timeout</span>' : "") + (paused ? ' <span class="runner-step-paused runner-step-paused-' + (step.pass ? "pass" : "fail") + '" title="paused">paused' + (runner.pauseOnFail && !step.pass ? " on fail" : "") + "</span>" : ""));
    }
    function stepStart(event, step) {
        updateHighlight(step);
        if (!$("#" + step.id).length) {
            var parentIsChain = isChainStep(step.parent), indent = parentIsChain ? 4 : step.depth * 20, isChain = isChainStep(step);
            if (isChain && lastStep && lastStep.depth >= step.depth && step.parent && step !== step.parent.steps[0]) {
                content.append('<div class="runner-break"></div>');
            }
            content.append('<div id="' + step.id + '" class="runner-pending runner-' + step.type + (isChain ? "-chain" : "") + '" style="margin-left: ' + indent + 'px;margin-right: 0px;"></div>');
            writeLabel(step, false, $("#" + step.id));
        }
    }
    function stepPause(event, step) {
        showDetails();
        writeLabel(step, true, $("#" + step.id));
        updateHighlight(step);
    }
    function stepUpdate(event, step) {
        if (step.count > 1) {
            writeLabel(step, false, $("#" + step.id));
        }
        updateHighlight(step);
        updateComplete();
    }
    function stepEnd(event, step) {
        var el = $("#" + step.id);
        el.addClass("runner-" + (step.pass ? "pass" : "fail"));
        el.attr("title", step.label);
        writeLabel(step, false, $("#" + step.id));
        updateHighlight(step);
        scrollToBottom();
        lastStep = step;
        updateCounters(step);
    }
    function updateCounters(step) {
        if (step.pass) {
            passed += 1;
        } else {
            failed += 1;
        }
        updateComplete();
    }
    function updateComplete(done) {
        var complete = $(".runner-complete");
        complete.removeClass("passed");
        complete.removeClass("failed");
        complete.removeClass("passed");
        if (runner.walking) {
            complete.addClass("paused");
        } else if (failed) {
            complete.addClass("failed");
        } else {
            complete.addClass("passed");
        }
        if (done) {
            complete.addClass("done");
        }
        complete.html(passed + " steps passed, " + failed + " failed." + (done ? " complete" : runner.walking ? " paused" : " running"));
    }
    function scrollToBottom() {
        overlay.find(".runner-scroller").scrollTop(content.height());
    }
    function done() {
        scrollToBottom();
        updateComplete(true);
    }
    function stop() {
        if (overlay) {
            $(".runner-overlay").remove();
            content = null;
            overlay = null;
            highlighter = null;
            highlightContainer = null;
            toolTip = null;
            lastStep = null;
            removeBinds();
        }
    }
    function close() {
        if (overlay) {
            stop();
            ux.runner.pause();
        }
    }
    function toggleMinimize() {
        overlay.toggleClass("minimize");
    }
    function showDetails() {
        content.removeClass("compact");
    }
    function hideDetails() {
        content.addClass("compact");
    }
    function toggleDetails() {
        return content.hasClass("compact") ? showDetails() : hideDetails();
    }
    function plus() {
        ux.runner.options.interval += plusMinusIncrement;
    }
    function minus() {
        ux.runner.options.interval -= plusMinusIncrement;
        if (ux.runner.options.interval < plusMinusIncrement) {
            ux.runner.options.interval = plusMinusIncrement;
        }
    }
    function restart() {
        stop();
        ux.runner.pause();
        ux.runner.restart();
    }
    function addBinds() {
        runner.on(runner.events.START, start);
        runner.on(runner.events.STEP_START, stepStart);
        runner.on(runner.events.STEP_UPDATE, stepUpdate);
        runner.on(runner.events.STEP_END, stepEnd);
        runner.on(runner.events.STEP_PAUSE, stepPause);
        runner.on(runner.events.DONE, done);
        $(".runner-close").click(runner.stop);
        $(".runner-restart").click(restart);
        $(".runner-pause").click(runner.pause);
        $(".runner-next").click(runner.next);
        $(".runner-resume").click(runner.resume);
        $(".runner-details").click(toggleDetails);
        $(".runner-minimize").click(toggleMinimize);
        $(".runner-plus").click(plus);
        $(".runner-minus").click(minus);
    }
    function removeBinds() {
        runner.off(runner.events.START, start);
        runner.off(runner.events.STEP_START, stepStart);
        runner.off(runner.events.STEP_UPDATE, stepUpdate);
        runner.off(runner.events.STEP_END, stepEnd);
        runner.off(runner.events.STEP_PAUSE, stepPause);
        runner.off(runner.events.DONE, done);
        $(".runner-close").unbind("click", runner.stop);
        $(".runner-restart").unbind("click", restart);
        $(".runner-pause").unbind("click", runner.pause);
        $(".runner-next").unbind("click", runner.next);
        $(".runner-resume").unbind("click", runner.resume);
        $(".runner-details").unbind("click", toggleDetails);
        $(".runner-minimize").unbind("click", toggleMinimize);
        $(".runner-plus").unbind("click", plus);
        $(".runner-minus").unbind("click", minus);
    }
    exports.start = start;
    exports.stepStart = stepStart;
    exports.stepEnd = stepEnd;
    exports.done = done;
    runner.stop = close;
    runner.onStart = start;
    return exports;
}

renderer();

runner.elementMethods.push(function(target) {
    target.scrollUp = function(amount) {
        return target.custom("scrollUp", function() {
            return target.element.scrollTop(target.element.scrollTop() - amount);
        });
    };
    target.scrollDown = function(amount) {
        return target.custom("scrollDown", function() {
            return target.element.scrollTop(target.element.scrollTop() + amount);
        });
    };
});

function Keyboard(el, lock) {
    this.el = el = ux.runner.locals.$(el);
    if (el.scope) {
        this.scope = el.scope();
    }
    var editableTypes = "text password number email url search tel";
    this.isEditable = /textarea|select/i.test(el[0].nodeName) || el[0].type && editableTypes.indexOf(el[0].type.toLowerCase()) > -1;
    if (this.isEditable) {
        this.selStart = el.getSelectionStart() || 0;
        this.selEnd = el.getSelectionEnd() || el.val().length;
        el.setSelection(this.selStart, this.selEnd);
        this.cursorPosition = this.selEnd;
    }
    this.capsLocked = false;
    if (lock) {
        this.lock();
    }
}

Keyboard.exec = function(el, actions, options) {
    var kbd = new Keyboard(el), acl = actions.match(/"[^"]+"|\w+/gim), action, val, i = 0, len = acl.length;
    kbd.lock();
    while (i < len) {
        val = acl[i];
        action = val.match(/[^"]+/gim)[0];
        if (action === "delete") {
            action = "del";
        }
        if (typeof kbd[action] === "function") {
            kbd[action]();
        } else {
            kbd.type(action);
        }
        kbd.release();
        i += 1;
    }
};

var proto = Keyboard.prototype;

proto.checkShiftKey = function(letter) {
    var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+{}|:"<>?~;', testLetter = letter.toUpperCase();
    if (testLetter === letter) {
        return true;
    }
    return false;
};

proto.key = {
    backspace: 8,
    tab: 9,
    enter: 13,
    shift: 16,
    ctrl: 17,
    alt: 18,
    pause: 19,
    capslock: 20,
    esc: 27,
    space: 32,
    pageup: 33,
    pagedown: 34,
    end: 35,
    home: 36,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    insert: 45,
    "delete": 46,
    "0": 48,
    "1": 49,
    "2": 50,
    "3": 51,
    "4": 52,
    "5": 53,
    "6": 54,
    "7": 55,
    "8": 56,
    "9": 57,
    a: 65,
    b: 66,
    c: 67,
    d: 68,
    e: 69,
    f: 70,
    g: 71,
    h: 72,
    i: 73,
    j: 74,
    k: 75,
    l: 76,
    m: 77,
    n: 78,
    o: 79,
    p: 80,
    q: 81,
    r: 82,
    s: 83,
    t: 84,
    u: 85,
    v: 86,
    w: 87,
    x: 88,
    y: 89,
    z: 90,
    numpad0: 96,
    numpad1: 97,
    numpad2: 98,
    numpad3: 99,
    numpad4: 100,
    numpad5: 101,
    numpad6: 102,
    numpad7: 103,
    numpad8: 104,
    numpad9: 105,
    "*": 106,
    "+": 107,
    "-": 109,
    ".": 110,
    f1: 112,
    f2: 113,
    f3: 114,
    f4: 115,
    f5: 116,
    f6: 117,
    f7: 118,
    f8: 119,
    f9: 120,
    f10: 121,
    f11: 122,
    f12: 123,
    "=": 187,
    ",": 188,
    "/": 191,
    "\\": 220
};

proto.type = function(phrase, options) {
    var str, i, len;
    if (this.selStart !== this.selEnd) {
        str = this.el.val();
        str = str.substr(0, this.selStart) + str.substr(this.selEnd);
        this.el.val(str);
        this.selStart = this.selEnd = null;
    }
    phrase = phrase || "";
    i = 0;
    len = phrase.length;
    while (i < len) {
        this.punch(phrase.charAt(i), options);
        i += 1;
    }
    return this;
};

proto.punch = function(char, options) {
    var el = this.el, scope = this.scope, evt, keyCode, shiftKey, lchar = char.toLowerCase(), curPos, val, attr = this.attr("ng-model"), ngModel;
    options = options || {};
    if (this.attr("disabled") !== "disabled") {
        keyCode = this.key[lchar];
        shiftKey = this.checkShiftKey(char);
        evt = this.createEvent("keydown", {
            shiftKey: shiftKey,
            keyCode: keyCode
        });
        this.dispatchEvent(el[0], "keydown", evt);
        if (this.isEditable && char.length === 1) {
            curPos = this.cursorPosition;
            val = el.val();
            val = val.substr(0, curPos) + char + val.substr(curPos);
            if (attr && scope) {
                scope.$eval(attr + ' = "' + val + '"');
            }
            el.val(val);
            this.cursorPosition += 1;
        }
        evt = this.createEvent("keyup", {
            shiftKey: shiftKey,
            keyCode: keyCode
        });
        this.dispatchEvent(el[0], "keyup", evt);
        if (scope) {
            if (ngModel = el.data("$ngModelController")) {
                ngModel.$setViewValue(el.val());
            }
            this.dispatchEvent(el[0], "change", this.createEvent("change", {}));
            if (!scope.$$phase) {
                scope.$apply();
            }
        }
    }
    return this;
};

proto.attr = function(attr) {
    return this.el.attr(attr) || this.el.attr("data-" + attr);
};

proto.enter = function(options) {
    this.punch("enter", options);
    return this;
};

proto.left = function(options) {
    var el = this.el;
    if (this.isEditable) {
        this.cursorPosition -= 1;
    } else {
        this.punch("left", options);
    }
    return this;
};

proto.up = function(options) {
    this.punch("up", options);
    return this;
};

proto.right = function(options) {
    var el = this.el;
    if (this.isEditable) {
        this.cursorPosition += 1;
    } else {
        this.punch("right", options);
    }
    return this;
};

proto.down = function(options) {
    this.punch("down", options);
    return this;
};

proto.home = function(options) {
    var el = this.el;
    if (this.isEditable) {
        this.cursorPosition = 0;
    } else {
        this.punch("home", options);
    }
    return this;
};

proto.end = function(options) {
    var el = this.el;
    if (this.isEditable) {
        this.cursorPosition = el.val().length;
    } else {
        this.punch("home", options);
    }
    return this;
};

proto.pageUp = function(options) {
    this.punch("pageup", options);
    return this;
};

proto.pageDown = function(options) {
    this.punch("pagedown", options);
    return this;
};

proto.del = function(options) {
    if (this.isEditable) {
        var val = this.el.val(), curPos = this.cursorPosition;
        this.el.val(val.substr(0, curPos) + val.substr(curPos + 1));
    } else {
        this.punch("delete", options);
    }
    return this;
};

proto.tab = function(options) {
    this.punch("tab", options);
    return this;
};

proto.backspace = function(options) {
    if (this.isEditable) {
        var val = this.el.val(), curPos = this.cursorPosition;
        this.el.val(val.substr(0, curPos - 1) + val.substr(curPos));
        this.cursorPosition = curPos - 1;
    } else {
        this.punch("backspace", options);
    }
    return this;
};

proto.capsLock = function() {
    this.capsLocked = !this.capsLocked;
};

proto.lock = function() {
    var doc = ux.runner.locals.$(document);
    doc.bind("mousedown", this.killEvent);
    doc.bind("keydown", this.killEvent);
    doc.bind("focus", this.killEvent);
    doc.bind("blur", this.killEvent);
    return this;
};

proto.release = function() {
    var doc = ux.runner.locals.$(document);
    doc.unbind("mousedown", this.killEvent);
    doc.unbind("keydown", this.killEvent);
    doc.unbind("focus", this.killEvent);
    doc.unbind("blur", this.killEvent);
    return this;
};

proto.killEvent = function(evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();
};

proto.dispatchEvent = function(el, type, evt) {
    if (el.dispatchEvent) {
        el.dispatchEvent(evt);
    } else if (el.fireEvent) {
        el.fireEvent("on" + type, evt);
    }
    return evt;
};

proto.createEvent = function(type, options) {
    var evt, e;
    e = ux.runner.locals.$.extend({
        bubbles: true,
        cancelable: true,
        view: window,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        keyCode: 0,
        charCode: 0
    }, options);
    if (ux.runner.locals.$.isFunction(document.createEvent)) {
        if (type.indexOf("key") !== -1) {
            try {
                evt = document.createEvent("KeyEvents");
                evt.initKeyEvent(type, e.bubbles, e.cancelable, e.view, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.keyCode, e.charCode);
            } catch (err) {
                evt = document.createEvent("Events");
                evt.initEvent(type, e.bubbles, e.cancelable);
                ux.runner.locals.$.extend(evt, {
                    view: e.view,
                    ctrlKey: e.ctrlKey,
                    altKey: e.altKey,
                    shiftKey: e.shiftKey,
                    metaKey: e.metaKey,
                    keyCode: e.keyCode,
                    charCode: e.charCode
                });
            }
        } else {
            evt = document.createEvent("HTMLEvents");
            evt.initEvent(type, false, true);
        }
    } else if (document.createEventObject) {
        evt = document.createEventObject();
        ux.runner.locals.$.extend(evt, e);
    }
    if (ux.runner.locals.$.browser !== undefined && (ux.runner.locals.$.browser.msie || ux.runner.locals.$.browser.opera)) {
        evt.keyCode = e.charCode > 0 ? e.charCode : e.keyCode;
        evt.charCode = undefined;
    }
    return evt;
};

function sendKeys(str, assertValue) {
    var s = {
        label: "sendKeys " + str,
        method: function() {
            if (s.element.length) {
                Keyboard.exec(s.element, str);
            }
        },
        validate: function() {
            if (!s.element.length) {
                s.label = "sendKeys failed because there is no element selected.";
                return false;
            }
            if (assertValue) {
                var attr = "ng-model", attrVal = s.element.attr(attr) || s.element.attr("data-" + attr);
                if (attrVal) {
                    s.value = s.element.scope().$eval(attrVal);
                } else {
                    s.value = s.element.val();
                }
                return s.value + "" === assertValue + "";
            }
            return true;
        }
    };
    return s;
}

runner.elementMethods.push(function(target) {
    target.sendKeys = function(str, strToCompare) {
        var s = sendKeys.apply(null, arguments);
        runner.createElementStep(s, target);
        return s;
    };
});

runner.inPageMethods.push(function() {
    "use strict";
    var $fn = this.jQuery ? this.jQuery.fn : this.angular.element.prototype, $ = this.jQuery || this.angular.element;
    $fn.getCursorPosition = function() {
        if (this.length === 0) {
            return -1;
        }
        return $(this).getSelectionStart();
    };
    $fn.setCursorPosition = function(position) {
        if (this.length === 0) {
            return this;
        }
        return $(this).setSelection(position, position);
    };
    $fn.getSelection = function() {
        if (this.length === 0) {
            return -1;
        }
        var s = $(this).getSelectionStart(), e = $(this).getSelectionEnd();
        return this[0].value.substring(s, e);
    };
    $fn.getSelectionStart = function() {
        if (this.length === 0) {
            return -1;
        }
        var input = this[0];
        var pos = input.value.length, r;
        if (input.createTextRange) {
            r = ux.runner.locals.window.document.selection.createRange().duplicate();
            r.moveEnd("character", input.value.length);
            if (r.text === "") {
                pos = input.value.length;
            }
            pos = input.value.lastIndexOf(r.text);
        } else if (input.selectionStart !== undefined) {
            pos = input.selectionStart;
        }
        return pos;
    };
    $fn.getSelectionEnd = function() {
        if (this.length === 0) {
            return -1;
        }
        var input = this[0];
        var pos = input.value.length, r;
        if (input.createTextRange) {
            r = document.selection.createRange().duplicate();
            r.moveStart("character", -input.value.length);
            if (r.text === "") {
                pos = input.value.length;
            }
            pos = input.value.lastIndexOf(r.text);
        } else if (input.selectionEnd !== undefined) {
            pos = input.selectionEnd;
        }
        return pos;
    };
    $fn.setSelection = function(selectionStart, selectionEnd) {
        if (this.length === 0) {
            return this;
        }
        var input = this[0];
        if (input.createTextRange) {
            var range = input.createTextRange();
            range.collapse(true);
            range.moveEnd("character", selectionEnd);
            range.moveStart("character", selectionStart);
            range.select();
        } else if (input.setSelectionRange) {
            input.focus();
            input.setSelectionRange(selectionStart, selectionEnd);
        }
        return this;
    };
});

runner.elementMethods.push(function(target) {
    function anchorClick(anchorObj) {
        if (anchorObj.click) {
            anchorObj.click();
        } else if (document.createEvent) {
            var evt = document.createEvent("MouseEvents");
            evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            var allowDefault = anchorObj.dispatchEvent(evt);
        }
    }
    target.sendMouse = function(focus, namespace) {
        var step, s = runner.createElementStep({
            label: "sendMouse",
            method: function() {
                if (this.element[0].href && this.element[0].href.length) {
                    anchorClick(this.element[0]);
                }
                return s;
            }
        }, this);
        namespace = namespace ? "." + namespace : "";
        if (namespace) {
            step = s.trigger("mousedown" + namespace);
            if (focus) {
                step = step.focus();
            }
            return step.trigger("mouseup" + namespace).trigger("click" + namespace);
        }
        return s.mousedown().focus().mouseup().click();
    };
});

runner.elementMethods.push(function(target) {
    target.sendTap = function(focus, namespace) {
        namespace = namespace ? "." + namespace : "";
        var step = target.trigger("touchstart" + namespace);
        if (focus) {
            step.focus();
        }
        return step.trigger("touchend" + namespace).trigger("click" + namespace);
    };
});

runner.elementMethods.push(function(target) {
    target.toBe = function(value) {
        var s = {
            label: "toBe " + value,
            value: undefined,
            timeout: runner.locals.options.interval,
            method: function() {},
            validate: function() {
                var result = $.trim(target.value) === value;
                if (!result) {
                    s.label = 'expected "' + target.value + '" to be "' + value + '"';
                } else {
                    s.label = 'toBe "' + value + '"';
                }
                return result;
            }
        };
        return runner.createElementStep(s, target);
    };
});

(function() {
    "use strict";
    try {
        angular.module("ux");
    } catch (e) {
        angular.module("ux", []);
    }
    angular.module("ux").run(function() {
        runner.getInjector = function() {
            if (runner.options.window) {
                return runner.options.window.angular.element(runner.options.rootElement).injector();
            }
            return angular.element(runner.options.window.document).injector();
        };
    }).factory("runner", function() {
        if (ux.runner.options.autoStart && typeof ux.runner.options.autoStart === "boolean") {
            ux.runner.run();
        }
        return ux.runner;
    });
})();
}(this.ux = this.ux || {}, function() {return this;}()));
