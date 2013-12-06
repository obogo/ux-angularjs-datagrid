/*
* uxDatagrid v.0.1.0
* (c) 2013, WebUX
* License: MIT.
*/
(function(exports, global){
var module;

try {
    module = angular.module("ux", [ "ng" ]);
} catch (e) {
    module = angular.module("ux");
}

exports.datagrid = {
    states: {
        BUILDING: "datagrid:building",
        APPENDING: "datagrid:appending",
        READY: "datagrid:ready",
        DEACTIVATED: "datagrid:deactivated",
        ACTIVATED: "datagrid:activated"
    },
    events: {
        INIT: "datagrid:init",
        BUILDING_PROGRESS: "datagrid:buildingProgress",
        APPENDING_PROGRESS: "datagrid:appendingProgress",
        READY: "datagrid:ready",
        BEFORE_UPDATE_WATCHERS: "datagrid:beforeUpdateWatchers",
        AFTER_UPDATE_WATCHERS: "datagrid:afterUpdateWatchers"
    },
    options: {
        compileAllRowsOnInit: false,
        updateDelay: 50,
        cushion: -50,
        chunkSize: 100,
        uncompiledClass: "uncompiled",
        dynamicRowHeights: false,
        renderThreshold: 50,
        creepLimit: 20
    },
    coreAddons: []
};

module.factory("addons", [ "$injector", function($injector) {
    function applyAddons(addons, instance) {
        var i = 0, len = addons.length, result;
        while (i < len) {
            result = $injector.get(addons[i]);
            if (typeof result === "function") {
                result(instance);
            } else {
                throw new Error("Addons expect a function to pass the grid instance to.");
            }
            i += 1;
        }
    }
    return function(instance, addons) {
        addons = addons instanceof Array ? addons : addons && addons.split(",") || [];
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

function each(list, method, data) {
    var i = 0, len, result;
    if (list && list.length) {
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

function Flow(exp) {
    var running = false, intv, current = null, list = [], uniqueMethods = {}, execStartTime, execEndTime, consoleMethodStyle = "font-weight: bold;color:#3399FF;";
    function getMethodName(method) {
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
                exp.log("flow:clear duplicate item %c%s", consoleMethodStyle, item.label);
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
    function insert(method, args, delay) {
        list.splice(1, 0, createItem(method, args, delay));
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
        exp.log("flow:finish %c%s took %dms", consoleMethodStyle, current.label, execEndTime - execStartTime);
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
                exp.log("	flow:delay for %c%s %sms", consoleMethodStyle, current.label, current.delay);
                clearTimeout(intv);
                intv = setTimeout(exec, current.delay);
            } else {
                exec();
            }
        }
    }
    function exec() {
        exp.log("flow:start method %c%s", consoleMethodStyle, current.label);
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
        exp.log("flow destroyed");
        exp = null;
    }
    exp = exp || {};
    exp.async = exp.hasOwnProperty("async") ? exp.async : true;
    exp.debug = exp.hasOwnProperty("debug") ? exp.debug : false;
    exp.insert = insert;
    exp.add = add;
    exp.unique = unique;
    exp.run = run;
    exp.destroy = destroy;
    exp.log = function() {
        if (exp.debug) {
            console.log.apply(console, arguments);
        }
    };
    return exp;
}

exports.datagrid.Flow = Flow;

function Datagrid(scope, element, attr, $compile) {
    var flow = new Flow(), unwatchers = [], content, scopes = [], active = [], lastVisibleScrollStart = 0, rowHeights = {}, rowOffsets = {}, viewHeight = 0, options, states = exports.datagrid.states, events = exports.datagrid.events, state = states.BUILDING, values = {
        scroll: 0,
        speed: 0,
        absSpeed: 0,
        scrollingStopIntv: null,
        activeRange: {
            min: 0,
            max: 0
        }
    }, exp = {};
    function init() {
        flow.unique(render);
        flow.unique(updateRowWatchers);
        element.append('<div class="content"></div>');
        content = element[0].getElementsByClassName("content")[0];
        setupExports();
    }
    function setupExports() {
        exp.__name = "ux-datagrid";
        exp.scope = scope;
        exp.element = element;
        exp.attr = attr;
        exp.rowsLength = 0;
        exp.scopes = scopes;
        exp.data = exp.data || [];
        exp.flow = flow;
        exp.unwatchers = unwatchers;
        exp.values = values;
        exp.options = options = angular.extend({}, exports.datagrid.options, scope.$eval(attr.options) || {});
    }
    exp.start = function start() {
        exp.dispatch(exports.datagrid.events.INIT);
        flow.add(exp.templateModel.createTemplates);
        flow.add(function updateDynamicRowHeights() {
            options.dynamicRowHeights = exp.templateModel.dynamicHeights();
        });
        flow.add(addListeners);
    };
    function addListeners() {
        unwatchers.push(scope.$watch(function() {
            return scope.$eval(attr.uxDatagrid);
        }, function() {
            flow.add(onDataChanged, [ arguments ]);
        }));
        unwatchers.push(scope.$on("$destroy", destroy));
    }
    function getScope(index) {
        return scopes[index];
    }
    function getRowElm(index) {
        return exp.chunkModel.getRow(index);
    }
    function getRowOffset(index) {
        if (rowOffsets[index] === undefined) {
            if (options.dynamicRowHeights) {
                updateAllHeights();
            } else {
                rowOffsets[index] = index * options.rowHeight;
            }
        }
        return rowOffsets[index];
    }
    function createDom(list) {
        flow.log("OVERWRITE DOM!!!");
        var len = list.length;
        flow.add(exp.chunkModel.chunkDom, [ list, options.chunkSize, '<div class="ux-datagrid-chunk">', "</div>", content ], 0);
        exp.rowsLength = len;
        rowHeights = {};
        flow.log("created %s dom elements", len);
    }
    function compileRows(startIndex, limit) {
        var s, time = Date.now() + options.renderThreshold, count = 0, nextIndex = startIndex;
        limit = limit || exp.rowsLength;
        scope.$emit(events.BUILDING_PROGRESS, startIndex, exp.rowsLength);
        console.log("	compiling at %s", startIndex);
        while (count < limit && time > Date.now()) {
            compileRow(startIndex + count);
            count += 1;
        }
        nextIndex += count;
        flow.log("	compiled %s of %s", count, limit);
        if (nextIndex < limit) {
            flow.insert(compileRows, [ nextIndex, limit ], 0);
        }
        return count;
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
            unwatch = s.$watch(function() {
                s.digested = true;
                unwatch();
            });
            scopes[index] = s;
            el = getRowElm(index);
            $compile(el)(s);
            deactivateScope(s);
        }
        return s;
    }
    function buildRows(list) {
        state = states.BUILDING;
        if (options.compileAllRowsOnInit) {
            flow.insert(compileRows, [ 0, exp.rowsLength ]);
        }
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
    function hasClass(node, cls) {
        var elClasses = " " + node.className + " ";
        return elClasses.indexOf(cls) >= 0;
    }
    function removeClass(node, cls) {
        if (cls) {
            var newClass = " " + node.className.replace(/[\t\r\n]/g, " ") + " ";
            var classes = newClass.split(" ");
            var index = classes.indexOf(cls);
            if (index !== -1) {
                classes.splice(index, 1);
                node.className = classes.join(" ");
            }
        } else {
            node.className = "";
        }
    }
    function deactivateScope(s) {
        var child;
        if (s && !isActive(s)) {
            s.$broadcast(events.DEACTIVATED);
            s.$$$watchers = s.$$watchers;
            s.$$watchers = [];
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
    function activateScope(s) {
        var child;
        if (s && s.$$$watchers) {
            s.$$watchers = s.$$$watchers;
            s.$$$watchers = null;
            if (s.$$childHead) {
                child = s.$$childHead;
                while (child) {
                    activateScope(child);
                    child = child.$$nextSibling;
                }
            }
            s.$broadcast(events.ACTIVATED);
            return true;
        }
        return !!(s && !s.$$$watchers);
    }
    function isActive(index) {
        var s = scopes[index];
        return !!(s && !s.$$$watchers);
    }
    function getOffsetIndex(offset) {
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
    function updateAllHeights() {
        var height = 0, i = 0;
        while (i < exp.rowsLength) {
            rowOffsets[i] = height;
            height += exp.templateModel.getTemplateHeight(exp.data[i]);
            i += 1;
        }
        options.rowHeight = exp.templateModel.getTemplateHeight("default");
    }
    function updateRowWatchers() {
        var loop = getStartingIndex(), offset = loop.i * 40, lastActive = [].concat(active), lastActiveIndex, s, prevS;
        exp.dispatch(events.BEFORE_UPDATE_WATCHERS, loop);
        resetMinMax();
        active.length = 0;
        flow.log("	visibleScrollStart %s visibleScrollEnd %s", loop.visibleScrollStart, loop.visibleScrollEnd);
        while (loop.i < exp.rowsLength) {
            prevS = scope.$$childHead ? scopes[loop.i - 1] : null;
            s = compileRow(loop.i);
            offset = getRowOffset(loop.i);
            if (offset >= loop.visibleScrollStart && offset <= loop.visibleScrollEnd) {
                if (loop.started === undefined) {
                    loop.started = loop.i;
                }
                updateMinMax(loop.i);
                if (activateScope(s)) {
                    removeClass(getRowElm(loop.i), options.uncompiledClass);
                    lastActiveIndex = lastActive.indexOf(loop.i);
                    if (lastActiveIndex !== -1) {
                        lastActive.splice(lastActiveIndex, 1);
                    }
                    active.push(loop.i);
                }
            }
            loop.i += loop.inc;
            if (loop.inc > 0 && offset > loop.visibleScrollEnd || loop.inc < 0 && offset < loop.visibleScrollStart) {
                break;
            }
        }
        loop.ended = loop.i - 1;
        flow.log("	startIndex %s endIndex %s", loop.startIndex, loop.i);
        deactivateList(lastActive);
        lastVisibleScrollStart = loop.visibleScrollStart;
        flow.log("	activated %s", active.join(", "));
        updateLinks();
        exp.dispatch(events.AFTER_UPDATE_WATCHERS, loop);
        flow.add(safeDigest, [ scope ]);
    }
    function deactivateList(lastActive) {
        var lastActiveIndex, deactivated = [];
        while (lastActive.length) {
            lastActiveIndex = lastActive.pop();
            deactivated.push(lastActiveIndex);
            deactivateScope(scopes[lastActiveIndex]);
        }
        flow.log("	deactivated %s", deactivated.join(", "));
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
        values.activeRange.min = values.activeRange.min < activeIndex && values.activeRange.min > 0 ? values.activeRange.min : activeIndex;
        values.activeRange.max = values.activeRange.max > activeIndex && values.activeRange.max > 0 ? values.activeRange.max : activeIndex;
    }
    function render() {
        if (state === states.BUILDING) {
            viewHeight = element[0].offsetHeight;
            flow.add(buildRows, [ exp.data ], 0);
            flow.add(updateAllHeights);
            flow.add(ready);
        } else if (state === states.READY) {
            flow.add(updateRowWatchers);
        } else {
            throw new Error("RENDER STATE INVALID");
        }
    }
    function onDataChanged() {
        flow.log("dataChanged");
        exp.data = exp.setData(scope.$eval(attr.uxDatagrid || attr.list), scope.$eval(attr.grouped)) || [];
        flow.add(reset);
    }
    function reset() {
        viewHeight = 0;
        destroyScopes();
        content.innerHTML = "";
        setupExports();
        exp.chunkModel.reset();
        state = states.BUILDING;
        flow.add(render);
    }
    exp.forceRenderScope = function forceRenderScope(index) {
        var s = scopes[index];
        if (!s && index > 0 && index < exp.rowsLength) {
            s = compileRow(index);
        }
        if (s) {
            activateScope(s);
            s.$digest();
            deactivateScope(s);
        }
    };
    exp.dispatch = function dispatch() {
        scope.$emit.apply(scope, arguments);
    };
    function destroyScopes() {
        each(scopes, function(s) {
            return s && s.$destroy();
        });
    }
    function destroy() {
        clearTimeout(values.scrollingStopIntv);
        values = null;
        while (unwatchers.length) {
            unwatchers.pop()();
        }
        flow.destroy();
        element[0].removeEventListener("scroll", exp.onUpdateScroll);
        scope.$$childHead = scopes[0];
        destroyScopes();
        for (var i in exp) {
            if (exp[i] && exp.hasOwnProperty("destroy")) {
                exp[i].destroy();
            }
            exp[i] = null;
        }
    }
    flow.add(init);
    flow.run();
    exp.render = function() {
        flow.add(render);
    };
    return exp;
}

module.directive("uxDatagrid", [ "$compile", "addons", function($compile, addons) {
    return {
        restrict: "AE",
        link: function(scope, element, attr) {
            var lv = new Datagrid(scope, element, attr, $compile);
            each(exports.datagrid.coreAddons, function(method) {
                method.apply(lv, [ lv ]);
            });
            addons(lv, attr.addons);
            lv.start();
        }
    };
} ]);

var ChunkArray = function() {};

ChunkArray.prototype = Array.prototype;

ChunkArray.prototype.min = 0;

ChunkArray.prototype.max = 0;

ChunkArray.prototype.templateStart = "";

ChunkArray.prototype.templateEnd = "";

ChunkArray.prototype.getStub = function getStub(str) {
    return this.templateStart + str + this.templateEnd;
};

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

exports.datagrid.coreAddons.chunkModel = function chunkModel(exp) {
    var _list, _rows, _chunkSize, _el, result = {};
    function getChunkList() {
        return _list;
    }
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
                result.push(childAry);
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
        }
        return result.length > size ? chunkList(result, size, templateStart, templateEnd) : result;
    }
    function calculateHeight(ary) {
        if (ary[0] instanceof ChunkArray) {
            var i = 0, len = ary.length, height = 0;
            while (i < len) {
                height += ary[i].height;
                i += 1;
            }
            ary.height = height;
        } else {
            ary.height = exp.templateModel.getHeight(_rows, ary.min, ary.max);
        }
        ary.templateStart = ary.templateStart.substr(0, ary.templateStart.length - 1) + ' style="width:100%;height:' + ary.height + 'px;">';
    }
    function chunkDom(list, size, templateStart, templateEnd, el) {
        _el = el;
        _chunkSize = size;
        _rows = list;
        _list = chunkList(list, size, templateStart, templateEnd);
        return el;
    }
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
                indexes.push(rowIndex % _chunkSize);
                break;
            }
            i += 1;
        }
        return indexes;
    }
    function getRow(rowIndex) {
        var indexes = getRowIndexes(rowIndex, _list);
        return buildDomByIndexes(indexes);
    }
    function buildDomByIndexes(indexes) {
        var i = 0, index, indxs = indexes.slice(0), ca = _list, el = _el;
        while (i < indxs.length) {
            index = indxs.shift();
            if (!ca.rendered) {
                //!el.childElementCount) {
                el.innerHTML = ca.getChildrenStr();
            }
            ca = ca[index];
            el = el.childNodes[index];
        }
        return el;
    }
    function reset() {
        if (_el) _el.innerHTML = "";
        _list = null;
        _chunkSize = null;
        _el = null;
    }
    result.chunkDom = chunkDom;
    result.getChunkList = getChunkList;
    result.getRowIndexes = function(rowIndex) {
        return getRowIndexes(rowIndex, _list);
    };
    result.getRow = getRow;
    result.reset = reset;
    dispatcher(result);
    exp.chunkModel = result;
    return result;
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.chunkModel);

exports.datagrid.events.RENDER_PROGRESS = "datagrid:renderProgress";

exports.datagrid.coreAddons.creepRenderModel = function creepRenderModel(exp) {
    var intv = 0, percent = 0, creepCount = 0;
    function digest(index) {
        var s = exp.scopes[index];
        if (!s || !s.digested) {
            exp.forceRenderScope(index);
        }
    }
    function calculatePercent() {
        var result = {
            count: 0
        };
        each(exp.scopes, calculateScopePercent, result);
        return result.count / exp.rowsLength;
    }
    function calculateScopePercent(s, index, list, result) {
        result.count += s ? 1 : 0;
    }
    function onInterval(started, ended) {
        var upIndex = started, downIndex = ended, time = Date.now() + exp.options.renderThreshold;
        while (time > Date.now() && (upIndex >= 0 || downIndex < exp.rowsLength)) {
            if (upIndex >= 0) {
                digest(upIndex);
                upIndex -= 1;
            }
            if (downIndex < exp.rowsLength) {
                digest(downIndex);
                downIndex += 1;
            }
        }
        percent = calculatePercent();
        stop();
        creepCount += 1;
        if (!exp.values.speed && exp.scopes.length < exp.rowsLength) {
            resetInterval(upIndex, downIndex);
        }
        exp.dispatch(exports.datagrid.events.RENDER_PROGRESS, percent);
    }
    function stop() {
        intv = false;
    }
    function resetInterval(started, ended) {
        stop();
        if (creepCount < exp.options.creepLimit) {
            exp.flow.add(onInterval, [ started, ended ], exp.options.renderThreshold);
            intv = true;
        }
    }
    function onAfterUpdateWatchers(event, loopData) {
        if (!intv) {
            creepCount = 0;
            resetInterval(loopData.started, loopData.ended);
        }
    }
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.BEFORE_UPDATE_WATCHERS, stop));
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.AFTER_UPDATE_WATCHERS, onAfterUpdateWatchers));
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.creepRenderModel);

exports.datagrid.coreAddons.normalizeModel = function normalizeModel(exp) {
    var originalData, normalizedData;
    function normalize(data, grouped, normalized) {
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
        originalData = data;
        if (grouped) {
            normalizedData = normalize(data, grouped);
        } else {
            normalizedData = data;
        }
        return normalizedData;
    };
    exp.getData = function() {
        return normalizedData;
    };
    exp.getOriginalData = function() {
        return originalData;
    };
    return exp;
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.normalizeModel);

exports.datagrid.coreAddons.scrollModel = function scrollModel(datagrid) {
    function setupScrolling() {
        datagrid.element[0].addEventListener("scroll", datagrid.onUpdateScroll);
        datagrid.unwatchers.push(function() {
            datagrid.element[0].removeEventListener("scroll", datagrid.onUpdateScroll);
        });
    }
    datagrid.onUpdateScroll = function onUpdateScroll(event) {
        var val = (event.target || event.srcElement || datagrid.element[0]).scrollTop;
        if (datagrid.values.scroll !== val) {
            datagrid.values.speed = val - datagrid.values.scroll;
            datagrid.values.absSpeed = Math.abs(datagrid.values.speed);
            datagrid.values.scroll = val;
        }
        datagrid.waitForStop();
    };
    datagrid.scrollTo = function scrollTo(value) {
        datagrid.element[0].scrollTop = value;
        datagrid.waitForStop();
    };
    datagrid.waitForStop = function waitForStop() {
        if (datagrid.flow.async) {
            clearTimeout(datagrid.values.scrollingStopIntv);
            datagrid.values.scrollingStopIntv = setTimeout(datagrid.onScrollingStop, datagrid.options.updateDelay);
        } else {
            datagrid.onScrollingStop();
        }
    };
    datagrid.onScrollingStop = function onScrollingStop() {
        datagrid.flow.log("scrollingStop");
        datagrid.values.speed = 0;
        datagrid.values.absSpeed = 0;
        datagrid.flow.add(datagrid.render);
    };
    datagrid.scrollToIndex = function scrollToIndex(index) {};
    datagrid.scrollToItem = function scrollToItem(item) {};
    datagrid.getNormalizedIndex = function getNormalizedIndex(item) {};
    datagrid.scope.$on(exports.datagrid.events.READY, setupScrolling);
    return datagrid;
};

exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.scrollModel);

exports.datagrid.coreAddons.push(function templateModel(exp) {
    "use strict";
    function trim(str) {
        str = str.replace(/\n/g, "");
        str = str.replace(/[\t ]+</g, "<");
        str = str.replace(/>[\t ]+</g, "><");
        str = str.replace(/>[\t ]+$/g, ">");
        return str;
    }
    exp.templateModel = function() {
        var templates = {}, totalHeight;
        function createTemplates() {
            var i, scriptTemplates = exp.element[0].getElementsByTagName("script"), len = scriptTemplates.length;
            for (i = 0; i < len; i += 1) {
                createTemplate(scriptTemplates[i]);
            }
            while (scriptTemplates.length) {
                exp.element[0].removeChild(scriptTemplates[0]);
            }
        }
        function createTemplate(scriptTemplate) {
            var template = trim(angular.element(scriptTemplate).html()), wrapper = document.createElement("div"), templateData;
            template = angular.element(template)[0];
            template.className += " " + exp.options.uncompiledClass + " {{$status}}";
            wrapper.appendChild(template);
            document.body.appendChild(wrapper);
            template = trim(wrapper.innerHTML);
            templateData = {
                name: scriptTemplate.attributes["data-template-name"].nodeValue || "default",
                item: scriptTemplate.attributes["data-template-item"].nodeValue,
                template: template,
                height: wrapper.offsetHeight
            };
            templates[templateData.name] = templateData;
            document.body.removeChild(wrapper);
            totalHeight = 0;
            return templateData;
        }
        function getTemplate(data) {
            return getTemplateByName(data._template);
        }
        function getTemplateByName(name) {
            if (templates[name]) {
                return templates[name];
            }
            return templates["default"];
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
            return count(templates);
        }
        function count(obj) {
            var i, c = 0;
            for (i in obj) {
                if (obj.hasOwnProperty(i)) {
                    c += 1;
                }
            }
            return c;
        }
        function getTemplateHeight(item) {
            return getTemplate(item).height;
        }
        function getHeight(list, startRowIndex, endRowIndex) {
            var i = startRowIndex, height = 0;
            if (!list.length) {
                return 0;
            }
            while (i <= endRowIndex) {
                height += getTemplateHeight(list[i]);
                i += 1;
            }
            return height;
        }
        return {
            createTemplates: createTemplates,
            getTemplate: getTemplate,
            getTemplateByName: getTemplateByName,
            templateCount: countTemplates,
            dynamicHeights: dynamicHeights,
            averageTemplateHeight: averageTemplateHeight,
            getHeight: getHeight,
            getTemplateHeight: getTemplateHeight
        };
    }();
});
}(this.ux = this.ux || {}, function() {return this;}()));
