/*global each, charPack, Flow, exports, module */

//TODO: The events or calls to the datagrid need to all be added to a queue. So if the grid is unable to do something then it will not loose it and can try it later. Even keep the last few that just went by so we know what just happened. This could ignore some updates if it knows there are more updates pending.

function ListView(scope, element, attr, $compile) {
    var flow = new Flow(),
        unwatchers = [],
        content,// the dom element with all of the chunks.
        scopes = [],
    // compiling
        active = [],
        lastVisibleScrollStart = 0,
        rowHeights = {},
        rowOffsets = {},
        viewHeight = 0,
    // convenience
        options,
        states = exports.listView.states,
        events = exports.listView.events,
    // rendering
        state = states.BUILDING, // ready is set to true after the initial digest.
    // exports
        values = {
            // scrolling
            scroll: 0,
            speed: 0,
            absSpeed: 0,
            scrollingStopIntv: null,
            activeRange: {min: 0, max: 0},
        },
        exp = {};

    /**
     * init
     */
    function init() {
        flow.unique(render);
        flow.unique(updateRowWatchers);
        element.append('<div class="content"></div>');
        content = element[0].getElementsByClassName('content')[0];
        setupExports();
    }

    function setupExports() {
        exp.__name = 'ux-ListView';
        exp.scope = scope;
        exp.element = element;
        exp.attr = attr;
        exp.rowsLength = 0;
        exp.scopes = scopes;
        exp.data = exp.data || [];
        // add variables that can be modified externally.
        exp.flow = flow;
        exp.unwatchers = unwatchers;
        exp.values = values;
        exp.options = options = angular.extend({}, ux.listView.options, scope.$eval(attr.options) || {});
    }

    /**
     * This is called after addons to allow overrides.
     */
    exp.start = function start() {
        exp.dispatch(ux.listView.events.INIT);
        flow.add(exp.templateModel.createTemplates);
        // if the templates have different heights. Then they are dynamic.
        flow.add(function updateDynamicRowHeights() {
            options.dynamicRowHeights = exp.templateModel.dynamicHeights();
        });
        flow.add(addListeners);
        flow.add(exp.setupScrolling);
    };

    function addListeners() {
        unwatchers.push(scope.$watch(function () {
            return scope.$eval(attr.uxListView);
        }, function () {
            flow.add(onDataChanged, [arguments]);
        }));

        unwatchers.push(scope.$on('$destroy', destroy));
    }

    function getScope(index) {
        return scopes[index];
    }

    function getRowElm(index) {
        return exp.chunkModel.getRow(index);
    }

    function getRowOffset(index) {
//TODO: need to reset row heights when a row is activated for the first time.... possibly every time for expanding rows.
        if (rowOffsets[index] === undefined) {
            if (options.dynamicRowHeights) { // dynamicRowHeights should be set by the templates.
                updateAllHeights();
            } else {
                rowOffsets[index] = index * options.rowHeight;
            }
        }
        return rowOffsets[index];
    }

    function createDom(list) {
        //TODO: if there is any dom. It needs destroyed first.
        flow.log("OVERWRITE DOM!!!");
        var len = list.length;
        flow.add(exp.chunkModel.chunkDom, [list, options.chunkSize, '<div class="ux-list-view-chunk">', '</div>', content], 0);
        exp.rowsLength = len;
        rowHeights = {};
        flow.log("created %s dom elements", len);
    }

    function compileRows(startIndex, limit) {
        var s, time = Date.now() + options.renderThreshold, count = 0, nextIndex = startIndex;
        limit = limit || exp.rowsLength;
        scope.$emit(events.BUILDING_PROGRESS, startIndex, exp.rowsLength);
        console.log("\tcompiling at %s", startIndex);
        while (count < limit && time > Date.now()) {
            compileRow(startIndex + count);
            count += 1;
        }
        nextIndex += count;
        flow.log("\tcompiled %s of %s", count, limit);
        if (nextIndex < limit) {
            flow.insert(compileRows, [nextIndex, limit], 0);
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
            s.$status = 'compiled';
            s[tpl.item] = exp.data[index]; // set the data to the scope.
            unwatch = s.$watch(function () {
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
            flow.insert(compileRows, [0, exp.rowsLength]);
        }
        flow.insert(createDom, [list], 0);
    }

    function ready() {
        state = states.READY;
        flow.add(render);
        flow.add(fireReadyEvent);
        flow.add(safeDigest, [scope]);
    }

    function fireReadyEvent() {
        scope.$emit(ux.listView.events.READY);
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
            var classes = newClass.split(' ');
            var index = classes.indexOf(cls);
            if (index !== -1) {
                classes.splice(index, 1);
                node.className = classes.join(' ');
            }
        } else {
            node.className = "";
        }
    }

    /**
     * Turn off watchers for that index scope and any of it's children.
     * @param s
     */
    function deactivateScope(s) {
        var child;
        // if the scope is not created yet. just skip.
        if (s && !isActive(s)) { // do not deactivate one that is already deactivated.
            s.$broadcast(events.DEACTIVATED); // can use to turn off jquery listeners.
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
        if (s && s.$$$watchers) { // do not activate one that is already active.
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
            s.$broadcast(events.ACTIVATED); // can use to turn on jquery listeners.
            return true;
        }
        return !!(s && !s.$$$watchers); // if it is active or not.
    }

    function isActive(index) {
        var s = scopes[index];
        return !!(s && !s.$$$watchers); // if it has $$$watchers it is deactivated.
    }

    function getOffsetIndex(offset) {
        // updateAllHeights must be called before this.
        var est = Math.floor(offset / exp.templateModel.averageTemplateHeight()),
            i = 0;
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
        var height = viewHeight,
            result = {
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
        //TODO: this is going to be updated to use ChunkArray data to be faster.
        var height = 0, i = 0;
        while (i < exp.rowsLength) {
            rowOffsets[i] = height;
            height += exp.templateModel.getTemplateHeight(exp.data[i]);
            i += 1;
        }
        options.rowHeight = exp.templateModel.getTemplateHeight('default');
    }

    /**
     * Activate or deactivate scopes that are within range.
     */
    function updateRowWatchers() {
        var loop = getStartingIndex(), offset = loop.i * 40, lastActive = [].concat(active),
            lastActiveIndex, s, prevS;
        exp.dispatch(events.BEFORE_UPDATE_WATCHERS, loop);
        // we only want to update stuff if we are scrolling slow.
        resetMinMax();
        active.length = 0; // make sure not to reset until after getStartingIndex.
        flow.log("\tvisibleScrollStart %s visibleScrollEnd %s", loop.visibleScrollStart, loop.visibleScrollEnd);
        while (loop.i < exp.rowsLength) {
            prevS = scope.$$childHead ? scopes[loop.i - 1] : null;
            s = compileRow(loop.i); // only compiles if it is not already compiled. Still returns the scope.
            offset = getRowOffset(loop.i);
            if ((offset >= loop.visibleScrollStart && offset <= loop.visibleScrollEnd)) {
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
                    // make sure to put them into active in the right order.
                    active.push(loop.i);
                }
            }
            loop.i += loop.inc;
            // optimize the loop
            if ((loop.inc > 0 && offset > loop.visibleScrollEnd) || (loop.inc < 0 && offset < loop.visibleScrollStart)) {
                break; // optimize the loop to escape when we get past the active area.
            }
        }
        loop.ended = loop.i - 1;
        flow.log("\tstartIndex %s endIndex %s", loop.startIndex, loop.i);
        deactivateList(lastActive);
        lastVisibleScrollStart = loop.visibleScrollStart;
        flow.log("\tactivated %s", active.join(', '));
        updateLinks();
        exp.dispatch(events.AFTER_UPDATE_WATCHERS, loop);
        flow.add(safeDigest, [scope]);
    }

    function deactivateList(lastActive) {
        var lastActiveIndex, deactivated = [];
        while (lastActive.length) {
            lastActiveIndex = lastActive.pop();
            deactivated.push(lastActiveIndex);
            deactivateScope(scopes[lastActiveIndex]);
        }
        flow.log("\tdeactivated %s", deactivated.join(', '));
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
            //TODO: removeExtraRows is not compatible. It needs removed. Only buildRows will work with chunking.
            //flow.add(removeExtraRows, [exp.data]);// if our data updates we need to remove extra rows.
            viewHeight = element[0].offsetHeight;
            flow.add(buildRows, [exp.data], 0);
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
        exp.data = exp.setData(scope.$eval(attr.uxListView || attr.list), scope.$eval(attr.grouped)) || [];
        flow.add(reset);
    }

    //reset = clear all and restart.
    function reset() {
        viewHeight = 0; // force to recalculate heights.
        destroyScopes();
        // now destroy all of the dom.
        content.innerHTML = '';
        setupExports();
        // make sure scopes are destroyed before this level and listeners as well or this will create a memory leak.
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
        // because child scopes may not be in order because of rendering techniques. We must loop through
        // all scopes and destroy them manually.
        each(scopes, function (s) {
            // listeners should be destroyed with the angular destroy.
            return s && s.$destroy(); // some scopes may be null because they were not compiled. Destroy existing ones.
        });
    }

    // destroy needs to put all watcher back before destroying or it will not destroy child scopes, or remove watchers.
    function destroy() {
        clearTimeout(values.scrollingStopIntv);
        values = null;
        while (unwatchers.length) {
            unwatchers.pop()();
        }
        flow.destroy();
        element[0].removeEventListener('scroll', exp.onUpdateScroll);
        scope.$$childHead = scopes[0];
        destroyScopes();
        // now remove every property on exports.
        for (var i in exp) {
            if (exp[i] && exp.hasOwnProperty('destroy')) {
                exp[i].destroy();
            }
            exp[i] = null;
        }
    }

    flow.add(init);
    flow.run();

    exp.render = function () {
        flow.add(render);
    };

    return exp;
}

module.directive('uxListView', ['$compile', 'addons', function ($compile, addons) {
    return {
        restrict: 'AE',
        link: function (scope, element, attr) {
            var lv = new ListView(scope, element, attr, $compile);
            each(ux.listView.coreAddons, function (method) {
                method.apply(lv, [lv]);
            });
            addons(lv, attr.addons);
            lv.start();
        }
    };
}]);
