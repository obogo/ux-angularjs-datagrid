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
        logEvents = [exports.datagrid.events.LOG, exports.datagrid.events.INFO, exports.datagrid.events.WARN, exports.datagrid.events.ERROR],
        exp = {}; // the datagrid public api

    // Initialize the datagrid.
    // add unique methods to the flow.
    function init() {
        flow.unique(reset);
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
        exp.update = update;
        exp.reset = reset;
        exp.isReady = isReady;
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
        exp.getRowIndex = exp.getIndexOf = getRowIndex;
        exp.getRowOffset = getRowOffset;
        exp.getRowHeight = getRowHeight;
        exp.getViewportHeight = getViewportHeight;
        exp.getContentHeight = getContentHeight;
        exp.getContent = getContent;
        exp.safeDigest = safeDigest;
        exp.getRowIndexFromElement = getRowIndexFromElement;
        exp.upateViewportHeight = updateViewportHeight;
        exp.calculateViewportHeight = calculateViewportHeight;
        exp.options = options = angular.extend({}, exports.datagrid.options, scope.$eval(attr.options) || {});
        exp.flow = flow = new Flow({async: options.hasOwnProperty('async') ? !!options.async : true, debug: options.hasOwnProperty('debug') ? options.debug : 0}, exp.dispatch);
        flow.add(init);// initialize core.
        flow.run();// start the flow manager.
    }

    // <a name="createContent">createConent</a> The `content` dom element is the only direct child created by the datagrid.
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

    // <a name="getContent">getContent</a> return the reference to the content div.
    function getContent() {
        return content;
    }

    // <a name="start">start</a> `start` is called after the addons are added.
    function start() {
        exp.dispatch(exports.datagrid.events.ON_INIT);
        content = createContent();
        waitForElementReady(0);
    }

    // <a name="waitForElementReady">waitForElementReady</a> this waits for the body element because if the grid has been constructed, but no heights are showing
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

    // <a name="addListeners">addListeners</a> Adds listeners. Notice that all listeners are added to the unwatchers array so that they can be cleared
    // before references are removed to avoid memory leaks with circular references amd to prevent events from
    // being listened to while the destroy is happening.
    function addListeners() {
        var unwatchFirstRender = scope.$on(exports.datagrid.events.ON_AFTER_RENDER, function () {
            unwatchFirstRender();
            flow.add(dispatch, [exports.datagrid.events.ON_STARTUP_COMPLETE]);
        });
        window.addEventListener('resize', onResize);
        unwatchers.push(scope.$on(exports.datagrid.events.UPDATE, update));
        unwatchers.push(scope.$on(exports.datagrid.events.ON_ROW_TEMPLATE_CHANGE, onRowTemplateChange));
        unwatchers.push(scope.$on('$destroy', destroy));
        flow.add(setupChangeWatcher, [], 0);
        exp.dispatch(exports.datagrid.events.ON_LISTENERS_READY);
    }

    // <a name="setupChangeWatcher">setupChangeWatcher</a> When a change happens update the dom.
    function setupChangeWatcher() {
        if (!changeWatcherSet) {
            exp.log("setupChangeWatcher");
            changeWatcherSet = true;
            unwatchers.push(scope.$watch(attr.uxDatagrid, onDataChangeFromWatcher));
            // force intial watcher.
            flow.add(render);
        }
    }

    function onDataChangeFromWatcher(newValue, oldValue, scope) {
        flow.add(onDataChanged, [newValue, oldValue]);
    }

    // <a name="updateViewportHeight">updateViewportHeight</a> This function can be used to force update the viewHeigth.
    function updateViewportHeight() {
        viewHeight = exp.calculateViewportHeight();
    }

    // <a name="isReady">isReady</a> return if grid state is <a href="#states.READY">states.READY</a>.
    function isReady() {
        return state === states.READY;
    }

    // <a name="calculateViewportHeight">calculateViewportHeight</a> Calculate Viewport Height can be expensive. Depending on the number of dom elemnts.
    // so if you need to use this method, use it sparingly because you may experience performance
    // issues if overused.
    function calculateViewportHeight() {
        return element[0].offsetHeight;
    }

    // <a name="onResize">onResize</a> When a resize happens dispatch that event for addons to listen to so events happen after
    // the grid has performed it's changes.
    function onResize(event) {
        dispatch(exports.datagrid.events.RESIZE, {event:event});
    }

    // <a name="getScope">getScope</a> Return the scope of the row at that index.
    function getScope(index) {
        return scopes[index];
    }

    // <a name="getRowElm">getRowElm</a> Return the dom element at that row index.
    function getRowElm(index) {
        return angular.element(exp.chunkModel.getRow(index));
    }

    // <a name="isCompiled">isCompiled</a> Return if the row is compiled or not.
    function isCompiled(index) {
        return !!scopes[index];
    }

    // <a name="getRowIndex">getRowIndex</a> Get the index of a row from a reference the data object of a row.
    function getRowIndex(item) {
        return this.getData().indexOf(item);
    }

    // <a name="getRowIndexFromElement">getRowIndexFromElement</a> Get the index of a row from a reference to a dom element that is contained within a row.
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

    // <a name="getRowOffset">getRowOffset</a> Return the scroll offset of a row by it's index. All offsets are cached, they get updated if
    // a row template changes, because it may change it height as well.
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

    // <a name="getRowHeight">getRowHeight</a> Return the cached height of a row by index.
    function getRowHeight(index) {
        return exp.templateModel.getTemplateHeight(exp.data[index]);
    }

    // <a name="getViewportHeight">getViewportHeight</a> Return the height of the viewable area of the datagrid.
    function getViewportHeight() {
        return viewHeight;
    }

    // <a name="getConentHeight">getContentHeight</a> Return the total height of the content of the datagrid.
    function getContentHeight() {
        return exp.chunkModel.getChunkList().height;
    }

    // <a name="createDom">createDom</a> This starts off the chunking. It creates all of the dom chunks, rows, etc for the datagrid.
    function createDom(list) {
        //TODO: if there is any dom. It needs destroyed first.
        exp.log("OVERWRITE DOM!!!");
        var len = list.length;
        // this async is important because it allows the updateRowWatchers on first digest to escape the current digest.
        flow.insert(exp.chunkModel.chunkDom, [list, options.chunkSize, '<div class="' + options.chunkClass + '">', '</div>', content], 0);
        exp.rowsLength = len;
        exp.log("created %s dom elements", len);
    }

    // Compile a row at that index. This creates the scope for that row when compiled. It does not perform a digest.
    function compileRow(index) {
        var s = scopes[index], prev, tpl, el;
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
            scopes[index] = s;
            el = getRowElm(index);
            el.removeClass(options.uncompiledClass);
            $compile(el)(s);
            deactivateScope(s);
        }
        return s;
    }

    // Set the state to <a name="states.BUILDING">states.BUILDING</a>. Then build the dom.
    function buildRows(list) {
        exp.log("\tbuildRows %s", list.length);
        state = states.BUILDING;
        flow.insert(createDom, [list], 0);
    }

    // Set the state to <a href="states.ON_READY">states.ON_READY</a> and start the first render.
    function ready() {
        exp.log("\tready");
        state = states.ON_READY;
        flow.add(render);
        flow.add(fireReadyEvent);
        flow.add(safeDigest, [scope]);
    }

    // Fire the <a name="events.ON_READY">events.ON_READY</a>
    function fireReadyEvent() {
        scope.$emit(exports.datagrid.events.ON_READY);
    }

    // SafeDigest by checking the render phase of the scope before rendering.
    // while this is not recommended by angular it is effective.
    function safeDigest(s) {
        if (!s.$$phase) {
            s.$digest();
        }
    }

    // One of the core features to the datagrid's performance it the ability to make only the scopes
    // that are in view to render. This deactivates a scope by removing it's $$watchers that angular
    // uses to know that it needs to digest. Thus inactivating the row. We also remove all watchers from
    // child scopes recursively storing them on each child in a separate variable to activation later.
    // They need to be reactivated before being destroyed for proper cleanup.
    // $$childHead and $$nextSibling variables are also updated for angular so that it will not even iterate
    // over a scope that is deactivated. It becomes completely hidden from the digest.
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

    // Taking a scope that is deactivated the watchers that it did have are now stored on $$$watchers and
    // can be put back to $$watchers so angular will pick up this scope on a digest. This is done recursively
    // though child scopes as well to activate them. It also updates the linking $$childHead and $$nextSiblings
    // to fully make sure the scope is as if it was before it was deactivated.
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

    // Check a scope by index to see if it is active.
    function isActive(index) {
        var s = scopes[index];
        return !!(s && !s.$$$watchers); // if it has $$$watchers it is deactivated.
    }

    // Given a scroll offset, get the index that is closest to that scroll offset value.
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

    // Because the datagrid can render as many as 50k rows. It becomes necessary to optimize loops by
    // determining the index to start checking for deactivated and activated scopes at instead of iterating
    // all of the items. This greatly improves a render because it only iterates from where the last render was.
    // It does this by taking the last first active element and then counting from there till we get to the top
    // of the start area. So we never have to loop the whole thing.
    function getStartingIndex() {
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

    // This is the core of the datagird rendering. It determines the range of scopes to be activated and
    // deactivates any scopes that were active before that are not still active.
    function updateRowWatchers() {
        var loop = getStartingIndex(), offset = loop.i * 40, lastActive = [].concat(active),
            lastActiveIndex, s, prevS;
        if (loop.i < 0) {// then scroll is negative. ignore it.
            return;
        }
        exp.dispatch(events.ON_BEFORE_UPDATE_WATCHERS, loop);
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
        updateLinks(); // update the $$childHead and $$nextSibling values to keep digest loops at a minimum count.
        flow.add(safeDigest, [scope]);
        // this dispatch needs to be after the digest so that it doesn't cause {} to show up in the render.
        exp.dispatch(events.ON_AFTER_UPDATE_WATCHERS, loop);
    }

    // <a name="deactivateList">deactivateList</a> Deactivate a list of scopes.
    function deactivateList(lastActive) {
        var lastActiveIndex, deactivated = [];
        while (lastActive.length) {
            lastActiveIndex = lastActive.pop();
            deactivated.push(lastActiveIndex);
            deactivateScope(scopes[lastActiveIndex]);
        }
        exp.log("\tdeactivated %s", deactivated.join(', '));
    }

    // <a name="updateLinks">updateLinks</a> Updates the $$childHead, $$childTail, $$nextSibling, and $$prevSibling values from the parent scope to completely
    // hide scopes that are deactivated from angular's knowledge so digest loops are as small as possible.
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

    // <a name="resetMinMax">resetMinMax</a> resets the min and max of the activeRange for what is activated.
    function resetMinMax() {
        values.activeRange.min = values.activeRange.max = -1;
    }

    // <a name="updateMinMax">updateMinMax</a> takes an index that has just been activated and updates the min and max
    // values for later calculations to know the range.
    function updateMinMax(activeIndex) {
        values.activeRange.min = values.activeRange.min < activeIndex && values.activeRange.min >= 0 ? values.activeRange.min : activeIndex;
        values.activeRange.max = values.activeRange.max > activeIndex && values.activeRange.max >= 0 ? values.activeRange.max : activeIndex;
    }

    function beforeRenderAfterDataChange() {
        if (values.dirty) {
            dispatch(exports.datagrid.events.ON_BEFORE_RENDER_AFTER_DATA_CHANGE);
        }
    }

    function afterRenderAfterDataChange() {
        if (values.dirty) {
            values.dirty = false;
            dispatch(exports.datagrid.events.ON_RENDER_AFTER_DATA_CHANGE);
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
        exp.log("render");
        if (readyToRender()) {
            waitCount = 0;
            exp.log("\trender %s", state);
            // Where [states.BUILDING](#states.BUILDING) is used
            if (state === states.BUILDING) {
                flow.add(buildRows, [exp.data], 0);
                flow.add(updateHeightValues);
                flow.add(ready);
            } else if (state === states.ON_READY) {
                exp.dispatch(exports.datagrid.events.ON_BEFORE_RENDER);
                flow.add(beforeRenderAfterDataChange);
                flow.add(updateRowWatchers);
                flow.add(afterRenderAfterDataChange);
                flow.add(exp.dispatch, [exports.datagrid.events.ON_AFTER_RENDER]);
            } else {
                throw new Error("RENDER STATE INVALID");
            }
        } else {
            exp.log("\tnot ready to render.");
        }
    }

    function update() {
        exp.warn("force update");
        onDataChanged(scope.$eval(attr.uxDatagrid), exp.data);
    }

    function onDataChanged(newVal, oldVal) {
        dispatch(exports.datagrid.events.ON_BEFORE_DATA_CHANGE);
        values.dirty = true;
        exp.log("dataChanged");
        exp.grouped = scope.$eval(attr.grouped);
        exp.data = exp.setData((newVal || attr.list), exp.grouped) || [];
        dispatch(exports.datagrid.events.ON_AFTER_DATA_CHANGE);
        flow.add(reset);
    }

    // <a name="reset">reset</a> clear all and rebuild.
    function reset() {
        dispatch(exports.datagrid.events.ON_RESET);
        state = states.BUILDING;
        destroyScopes();
        // now destroy all of the dom.
        rowOffsets = {};
        active.length = 0;
        scopes.length = 0;
        content.children().unbind();
        content.children().remove();
        // make sure scopes are destroyed before this level and listeners as well or this will create a memory leak.
        exp.chunkModel.reset();
        flow.add(updateViewportHeight);
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

    function isLogEvent(evt) {
        return logEvents.indexOf(evt) !== -1;
    }

    function dispatch(event) {
        if (!isLogEvent(event)) exp.info('$emit %s', event);// THIS SHOULD ONLY EMIT. Broadcast could perform very poorly especially if there are a lot of rows.
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

    exports.logWrapper('datagrid', exp, 'green', dispatch);
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
