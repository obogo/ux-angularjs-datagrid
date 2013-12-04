/*
* uxListView v.0.1.0
* (c) 2013, WebUX
* License: MIT.
*/
(function(exports, global){
(function() {
    "use strict";
    angular.module("addons", []).factory("addons", [ "$injector", function($injector) {
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
})();

function charPack(char, amount) {
    var str = "";
    while (str.length < amount) {
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

function Flow() {
    var exports = {}, running = false, intv, current = null, list = [], uniqueMethods = {}, execStartTime, execEndTime, consoleMethodStyle = "font-weight: bold;color:#3399FF;";
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
                exports.log("flow:clear duplicate item %c%s", consoleMethodStyle, item.label);
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
        exports.log("flow:finish %c%s took %dms", consoleMethodStyle, current.label, execEndTime - execStartTime);
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
            if (current.delay !== undefined) {
                exports.log("	flow:delay for %c%s %sms", consoleMethodStyle, current.label, current.delay);
                clearTimeout(intv);
                intv = setTimeout(exec, current.delay);
            } else {
                exec();
            }
        }
    }
    function exec() {
        exports.log("flow:start method %c%s", consoleMethodStyle, current.label);
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
        exports.log("flow destroyed");
        exports = null;
    }
    exports.insert = insert;
    exports.add = add;
    exports.unique = unique;
    exports.run = run;
    exports.destroy = destroy;
    exports.log = function() {
        console.log.apply(console, arguments);
    };
    return exports;
}

(function() {
    "use strict";
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
    ux.listView.coreAddons.chunkModel = function chunkModel(exports) {
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
                    childAry.templateModel = exports.templateModel;
                    childAry.templateStart = templateStart;
                    childAry.templateEnd = templateEnd;
                    result.push(childAry);
                }
                childAry.push(item);
                childAry.max = item.max || i;
                i += 1;
            }
            calculateHeight(childAry);
            if (!result.min) {
                result.min = result[0].min;
                result.max = result[result.length - 1].max;
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
                ary.height = exports.templateModel.getHeight(_rows, ary.min, ary.max);
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
        exports.chunkModel = result;
        return result;
    };
    ux.listView.coreAddons.push(ux.listView.coreAddons.chunkModel);
})();

ux.listView.events.RENDER_PROGRESS = "listView:renderProgress";

ux.listView.coreAddons.push(function creepRenderModel(exports) {
    var intv = 0, percent = 0, creepCount = 0, creepLimit = 10;
    function digest(index) {
        var s = exports.scopes[index];
        if (!s || !s.digested) {
            exports.forceRenderScope(index);
        }
    }
    function onInterval(started, ended) {
        var upIndex = started, downIndex = ended, time = Date.now() + exports.options.renderThreshold;
        while (time > Date.now() && (upIndex > 0 || downIndex < exports.rowsLength)) {
            if (upIndex >= 0) {
                digest(upIndex);
                upIndex -= 1;
            }
            if (downIndex < exports.rowsLength) {
                digest(downIndex);
                downIndex += 1;
            }
        }
        percent = exports.scopes.length / exports.rowsLength;
        stop();
        creepCount += 1;
        if (!exports.values.speed && exports.scopes.length < exports.rowsLength) {
            resetInterval(upIndex, downIndex);
        }
        exports.dispatch(ux.listView.events.RENDER_PROGRESS, percent);
    }
    function stop() {
        clearTimeout(intv);
        intv = 0;
    }
    function resetInterval(started, ended) {
        stop();
        if (creepCount < creepLimit) {
            intv = setTimeout(onInterval, exports.options.renderThreshold, started, ended);
        }
    }
    function onAfterUpdateWatchers(event, loopData) {
        if (!intv) {
            creepCount = 0;
            resetInterval(loopData.started, loopData.ended);
        }
    }
    exports.unwatchers.push(exports.scope.$on(ux.listView.events.BEFORE_UPDATE_WATCHERS, stop));
    exports.unwatchers.push(exports.scope.$on(ux.listView.events.AFTER_UPDATE_WATCHERS, onAfterUpdateWatchers));
});

ux.listView.coreAddons.push(function normalizeModel(exports) {
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
    exports.setData = function(data, grouped) {
        originalData = data;
        if (grouped) {
            normalizedData = normalize(data, grouped);
        } else {
            normalizedData = data;
        }
        return normalizedData;
    };
    exports.getData = function() {
        return normalizedData;
    };
    exports.getOriginalData = function() {
        return originalData;
    };
    return exports;
});

ux.listView.coreAddons.push(function scrollModel(exports) {
    exports.setupScrolling = function setupScrolling() {
        exports.element[0].addEventListener("scroll", exports.onUpdateScroll);
        exports.unwatchers.push(function() {
            exports.element[0].removeEventListener("scroll", exports.onUpdateScroll);
        });
    };
    exports.onUpdateScroll = function onUpdateScroll(event) {
        var val = (event.target || event.srcElement || exports.element[0]).scrollTop;
        if (exports.values.scroll !== val) {
            exports.values.speed = val - exports.values.scroll;
            exports.values.absSpeed = Math.abs(exports.values.speed);
            exports.values.scroll = val;
        }
        exports.waitForStop();
    };
    exports.scrollTo = function scrollTo(value) {
        exports.element[0].scrollTop = value;
        exports.waitForStop();
    };
    exports.waitForStop = function waitForStop() {
        clearTimeout(exports.values.scrollingStopIntv);
        exports.values.scrollingStopIntv = setTimeout(exports.onScrollingStop, exports.options.updateDelay);
    };
    exports.onScrollingStop = function onScrollingStop() {
        exports.flow.log("scrollingStop");
        exports.values.speed = 0;
        exports.values.absSpeed = 0;
        exports.flow.add(exports.render);
    };
});

ux.listView.events.STATS_UPDATE = "ux-listView:statsUpdate";

ux.listView.coreAddons.push(function statsModel(exports) {
    var initStartTime = 0, rendersTotal = 0, renders = [], unwatchers = [];
    var api = {
        initialRenderTime: 0,
        averageRenderTime: 0
    };
    function startInit() {
        initStartTime = Date.now();
    }
    function stopInit() {
        api.initialRenderTime = Date.now() - initStartTime;
        clearWatchers();
    }
    function clearWatchers() {
        while (unwatchers.length) {
            unwatchers.pop()();
        }
    }
    function renderStart() {
        renders.push(Date.now());
    }
    function renderStop() {
        var index = renders.length - 1;
        renders[index] = Date.now() - renders[index];
        rendersTotal += renders[index];
        updateAverage();
    }
    function updateAverage() {
        api.renders = renders.length;
        api.averageRenderTime = rendersTotal / api.renders;
        exports.dispatch(ux.listView.events.STATS_UPDATE, api);
    }
    unwatchers.push(exports.scope.$on(ux.listView.events.INIT, startInit));
    unwatchers.push(exports.scope.$on(ux.listView.events.READY, stopInit));
    exports.unwatchers.push(exports.scope.$on(ux.listView.events.BEFORE_UPDATE_WATCHERS, renderStart));
    exports.unwatchers.push(exports.scope.$on(ux.listView.events.AFTER_UPDATE_WATCHERS, renderStop));
    exports.stats = api;
});

ux.listView.coreAddons.push(function templateModel(exports) {
    "use strict";
    function trim(str) {
        str = str.replace(/\n/g, "");
        str = str.replace(/[\t ]+</g, "<");
        str = str.replace(/>[\t ]+</g, "><");
        str = str.replace(/>[\t ]+$/g, ">");
        return str;
    }
    exports.templateModel = function() {
        var templates = {}, totalHeight;
        function createTemplates() {
            var i, scriptTemplates = exports.element[0].getElementsByTagName("script"), len = scriptTemplates.length;
            for (i = 0; i < len; i += 1) {
                createTemplate(scriptTemplates[i]);
            }
            while (scriptTemplates.length) {
                exports.element[0].removeChild(scriptTemplates[0]);
            }
        }
        function createTemplate(scriptTemplate) {
            var template = trim(angular.element(scriptTemplate).html()), wrapper = document.createElement("div"), templateData;
            template = angular.element(template)[0];
            template.className += " " + exports.options.uncompiledClass + " {{$status}}";
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

(function() {
    "use strict";
    angular.module("ux").factory("iosScrollFrictionAddon", function() {
        return function(listView) {
            var exports = listView, values = exports.values, flow = exports.flow, friction = .95, stopThreshold = 1, iOS = navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false;
            if (iOS) {
                exports.setupScrolling = function setupScrolling() {
                    flow.log("scrollFriction:setupScrolling");
                    exports.options.updateDelay = 10;
                    exports.element[0].addEventListener("scroll", exports.onUpdateScroll);
                    exports.unwatchers.push(function() {
                        exports.element[0].removeEventListener("scroll", exports.onUpdateScroll);
                    });
                };
                exports.onUpdateScroll = function onUpdateScroll(event) {
                    flow.log("scrollFriction:onUpdateScroll");
                    var val = (event.target || event.srcElement || exports.element[0]).scrollTop;
                    if (values.scroll !== val) {
                        values.speed = val - values.scroll;
                        values.absSpeed = Math.abs(values.speed);
                        values.scroll = val;
                    }
                    exports.waitForStop();
                };
                exports.scrollTo = function scrollTo(value) {
                    exports.element[0].scrollTop = value;
                    exports.waitForStop();
                };
                exports.waitForStop = function waitForStop() {
                    flow.log("scrollFriction:waitForStop");
                    clearTimeout(values.scrollingStopIntv);
                    values.scrollingStopIntv = setTimeout(exports.onScrollingStop, exports.options.updateDelay);
                };
                exports.onScrollingStop = function onScrollingStop() {
                    flow.log("scrollFriction:scrollingStop");
                    if (values.absSpeed > stopThreshold) {
                        exports.applyScrollFriction();
                    } else {
                        values.speed = 0;
                        values.absSpeed = 0;
                        flow.add(exports, exports.render);
                    }
                };
                exports.applyScrollFriction = function applyScrollFriction() {
                    var value = 0;
                    if (values.absSpeed > stopThreshold) {
                        value = values.speed * friction;
                    }
                    if (value) {
                        listView.element[0].scrollTop += value;
                    }
                };
            }
        };
    });
})();
}(this.ux = this.ux || {}, function() {return this;}()));
