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
        values = { // `values` is the object that is used to share data for scrolling and other shared values.
            dirty: false, // if the data is dirty and a render has not happended since the data change.
            scroll: 0, // current scroll value of the grid
            speed: 0, // current speed of the scroll
            absSpeed: 0, // current absSpeed of the grid.
            scrollPercent: 0, // the current percent position of the scroll.
            touchDown: false, // if there is currently a touch start and not a touch end. Since touch is used for scrolling on a touch device. Ignored for desktop.
            scrollingStopIntv: null, // interval that allows waits for checks to know when the scrolling has stopped and a render is needed.
            activeRange: {min: 0, max: 0} // the current range of active scopes.
        },
        exp = {}; // the datagrid public api

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
        exp.render = function () {
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
        exp.flow = flow = new Flow({async: options.hasOwnProperty('async') ? !!options.async : true, debug: options.hasOwnProperty('debug') ? options.debug : 0}, exp.dispatch);
        flow.add(init);// initialize core.
        flow.run();// start the flow manager.
    }

    // The `content` dom element is the only direct child created by the datagrid.
    // It is used so append all of the `chunks` so that the it can be scrolled.
    // If the dom element is provided with the class `content` then that dom element will be used
    // allowing the user to add custom classes directly tot he `content` dom element.
    function createContent() {
        var cnt = element[0].getElementsByClassName('content')[0], classes = 'content';
        if (cnt) { // if there is an old one. Pull the classes from it.
            classes = cnt.className || 'content';
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
            if(count < 1) {
                // if they are doing custom compiling. They may compile before addit it to the dom.
                // allow a pass to happen just in case.
                flow.add(waitForElementReady, [count + 1], 0);// retry.
                return;
            } else {
                flow.warn("Datagrid: Dom Element does not have a height.");
            }
        }
        flow.add(exp.templateModel.createTemplates, null, 0); // allow element to be added to dom.
        // if the templates have different heights. Then they are dynamic.
        flow.add(function updateDynamicRowHeights() {
            options.dynamicRowHeights = exp.templateModel.dynamicHeights();
        });
        flow.add(addListeners);
    }

    function addListeners() {
        window.addEventListener('resize', onResize);
        unwatchers.push(scope.$on(exports.datagrid.events.ON_ROW_TEMPLATE_CHANGE, onRowTemplateChange));
        unwatchers.push(scope.$on('$destroy', destroy));
        flow.add(setupChangeWatcher, [], 0);
        exp.dispatch(exports.datagrid.events.LISTENERS_READY);
    }

    function setupChangeWatcher() {
        if (!changeWatcherSet) {
            changeWatcherSet = true;
            var lastLength = 0, lastResult = null, len;
            unwatchers.push(scope.$watch(function () {
                var result = scope.$eval(attr.uxDatagrid);
                len = result && result.length || 0;
                if (lastResult === result && lastLength !== len) {
                    //TODO: this needs tested to make sure it calls if the length changes.
                    flow.add(onDataChanged);// the length of the array changed.
                }
                lastResult = result;
                lastLength = len;
                return result;
            }, function () {
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
        dispatch(exports.datagrid.events.RESIZE, {event:event});
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
            if (options.dynamicRowHeights) { // dynamicRowHeights should be set by the templates.
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
        flow.add(exp.chunkModel.chunkDom, [list, options.chunkSize, '<div class="' + options.chunkClass + '">', '</div>', content], 0);
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
            s.$status = 'compiled';
            s[tpl.item] = exp.data[index]; // set the data to the scope.
            s.$index = index;
            unwatch = s.$watch(function () {
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
        flow.insert(createDom, [list], 0);
    }

    function ready() {
        state = states.READY;
        flow.add(render);
        flow.add(fireReadyEvent);
        flow.add(safeDigest, [scope]);
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
        if (s && !isActive(s)) { // do not deactivate one that is already deactivated.
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
            return true;
        }
        return !!(s && !s.$$$watchers); // if it is active or not.
    }

    function isActive(index) {
        var s = scopes[index];
        return !!(s && !s.$$$watchers); // if it has $$$watchers it is deactivated.
    }

    function getOffsetIndex(offset) {
        // updateHeightValues must be called before this.
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

    function updateHeightValues() {
        //TODO: this is going to be updated to use ChunkArray data to be faster.
        var height = 0, i = 0;
        while (i < exp.rowsLength) {
            rowOffsets[i] = height;
            height += exp.templateModel.getTemplateHeight(exp.data[i]);
            i += 1;
        }
        options.rowHeight = exp.rowsLength ? exp.templateModel.getTemplateHeight('default') : 0;
    }

    /**
     * Activate or deactivate scopes that are within range.
     */
    function updateRowWatchers() {
        var loop = getStartingIndex(), offset = loop.i * 40, lastActive = [].concat(active),
            lastActiveIndex, s, prevS;
        if (loop.i < 0) {// then scroll is negative. ignore it.
            return;
        }
        exp.dispatch(events.BEFORE_UPDATE_WATCHERS, loop);
        // we only want to update stuff if we are scrolling slow.
        resetMinMax();// this needs to always be set after the dispatch of before update watchers in case they need the before activeRange.
        active.length = 0; // make sure not to reset until after getStartingIndex.
        exp.log("\tvisibleScrollStart %s visibleScrollEnd %s", loop.visibleScrollStart, loop.visibleScrollEnd);
        while (loop.i < exp.rowsLength) {
            prevS = scope.$$childHead ? scopes[loop.i - 1] : null;
            offset = getRowOffset(loop.i); // this is where the chunks and rows get created is when they are requested if they don't exist.
            if ((offset >= loop.visibleScrollStart && offset <= loop.visibleScrollEnd)) {
                s = compileRow(loop.i); // only compiles if it is not already compiled. Still returns the scope.
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
            if ((loop.inc > 0 && offset > loop.visibleScrollEnd) || (loop.inc < 0 && offset < loop.visibleScrollStart)) {
                break; // optimize the loop to escape when we get past the active area.
            }
        }
        loop.ended = loop.i - 1;
        exp.log("\tstartIndex %s endIndex %s", loop.startIndex, loop.i);
        deactivateList(lastActive);
        lastVisibleScrollStart = loop.visibleScrollStart;
        exp.log("\tactivated %s", active.join(', '));
        updateLinks();
        flow.add(safeDigest, [scope]);
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
        exp.log("\tdeactivated %s", deactivated.join(', '));
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
                flow.add(render, null, 0);// have it wait a moment for the height to change.
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
                flow.add(buildRows, [exp.data], 0);
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
        flow.add(exp.dispatch, [exports.datagrid.events.AFTER_RENDER]);
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
        viewHeight = 0; // force to recalculate heights.
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
        var index = exp.getNormalizedIndex(item),
            el = getRowElm(index), s = el.hasClass(options.uncompiledClass) ? compileRow(index) : el.scope();
        if (s !== scope) {
            s.$destroy();
            scopes[index] = null;
            el.replaceWith(exp.templateModel.getTemplate(item).template);
            scopes[index] = compileRow(index);
            updateHeights(index);
        }
    }

    function updateHeights(rowIndex) {
        flow.add(exp.chunkModel.updateAllChunkHeights, [rowIndex]);
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
        each(scopes, function (s, index) {
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
        scope.datagrid = null; // we have a circular reference. break it on destroy.
        exp.log('destroying grid');
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
            if (exp[i] && exp[i].hasOwnProperty('destroy')) {
                exp[i].destroy();
                exp[i] = null;
            }
        }
        //activate scopes so they can be destroyed by angular.
        destroyScopes();
        element.remove();// this seems to be the most memory efficient way to remove elements.
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

    exports.logWrapper('datagrid', exp, 'green');
    setupExports();

    return exp;
}

module.directive('uxDatagrid', ['$compile', 'addons', function ($compile, addons) {
    return {
        restrict: 'AE',
        link: function (scope, element, attr) {
            var inst = new Datagrid(scope, element, attr, $compile);
            scope.datagrid = inst;// expose to scope.
            each(exports.datagrid.coreAddons, function (method) {
                method.apply(inst, [inst]);
            });
            addons(inst, attr.addons);
            inst.start();
        }
    };
}]);
