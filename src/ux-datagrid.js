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
        // - if the data is dirty and a render has not happended since the data change.
        dirty: false,
        // - current scroll value of the grid
        scroll: 0,
        // - current speed of the scroll
        speed: 0,
        // - current absSpeed of the grid.
        absSpeed: 0,
        // - the current percent position of the scroll.
        scrollPercent: 0,
        // - if there is currently a touch start and not a touch end. Since touch is used for scrolling on a touch device. Ignored for desktop.
        touchDown: false,
        // - interval that allows waits for checks to know when the scrolling has stopped and a render is needed.
        scrollingStopIntv: null,
        // - the current range of active scopes.
        activeRange: {min: 0, max: 0}
    };
    // listing the log events so they can be ignored if needed.
    var logEvents = [exports.datagrid.events.LOG, exports.datagrid.events.INFO, exports.datagrid.events.WARN, exports.datagrid.events.ERROR];
    // the instance of the datagrid that will be referenced by all addons.
    var inst = {};
    // wrap the instance for logging.
    var eventLogger = exports.logWrapper('datagrid event', inst, 'grey', dispatch);

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
        inst.render = function () {
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
        inst.flow = flow = new Flow({async: options.hasOwnProperty('async') ? !!options.async : true, debug: options.hasOwnProperty('debug') ? options.debug : 0}, inst.dispatch);
        flow.add(init);// initialize core.
        flow.run();// start the flow manager.
    }

    /**
     * ###<a name="createContent">createConent</a>###
     * The [content](#content) dom element is the only direct child created by the datagrid.
     * It is used so append all of the `chunks` so that the it can be scrolled.
     * If the dom element is provided with the class [content](#content) then that dom element will be used
     * allowing the user to add custom classes directly tot he [content](#content) dom element.
     */
    function createContent() {
        var contents = element[0].getElementsByClassName('content'), cnt, classes = 'content';
        contents = exports.filter(contents, filterOldContent);
        cnt = contents[0];
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

    /**
     * ###<a name="filterOldContent">filterOldContent</a>###
     * filter the list of content dom to remove any references to the [oldContent][#oldContent].
     * @param cnt
     * @param index
     * @param list
     * @returns {boolean}
     */
    function filterOldContent(cnt, index, list) {
        return angular.element(cnt).hasClass('old-content') ? false : true;
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
                flow.add(waitForElementReady, [count + 1], 0);// retry.
                return;
            } else {
                flow.warn("Datagrid: Dom Element does not have a height.");
            }
        }
        flow.add(inst.templateModel.createTemplates, null, 0); // allow element to be added to dom.
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
        var unwatchFirstRender = scope.$on(exports.datagrid.events.ON_BEFORE_RENDER_AFTER_DATA_CHANGE, function () {
            unwatchFirstRender();
            flow.add(dispatch, [exports.datagrid.events.ON_STARTUP_COMPLETE]);
        });
        window.addEventListener('resize', onResize);
        unwatchers.push(scope.$on(exports.datagrid.events.UPDATE, update));
        unwatchers.push(scope.$on(exports.datagrid.events.ON_ROW_TEMPLATE_CHANGE, onRowTemplateChange));
        unwatchers.push(scope.$on('$destroy', destroy));
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
            unwatchers.push(scope.$watch(attr.uxDatagrid, onDataChangeFromWatcher));
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
        flow.add(onDataChanged, [newValue, oldValue]);
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
        dispatch(exports.datagrid.events.RESIZE, {event: event});
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
            if (options.dynamicRowHeights) { // dynamicRowHeights should be set by the templates.
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
        flow.insert(inst.chunkModel.chunkDom, [list, options.chunkSize, '<div class="' + options.chunkClass + '">', '</div>', content], 0);
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
            s.$status = 'compiled';
            s[tpl.item] = inst.data[index]; // set the data to the scope.
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
        inst.log("\tbuildRows %s", list.length);
        state = states.BUILDING;
        flow.insert(createDom, [list], 0);
    }

    /**
     * ###<a name="ready">ready</a>###
     * Set the state to <a href="states.ON_READY">states.ON_READY</a> and start the first render.
     */
    function ready() {
        inst.log("\tready");
        state = states.ON_READY;
        flow.add(render);
        flow.add(fireReadyEvent);
        flow.add(safeDigest, [scope]);
    }
    /**
     * ###<a name="fireReadyEvent">fireReadyEvent</a>###
     * Fire the <a name="events.ON_READY">events.ON_READY</a>
     */
    function fireReadyEvent() {
        scope.$emit(exports.datagrid.events.ON_READY);
    }

    /**
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
     * ###<a name="desctivateScope">deactivateScope</a>###
     * One of the core features to the datagrid's performance it the ability to make only the scopes
     * that are in view to render. This deactivates a scope by removing it's $$watchers that angular
     * uses to know that it needs to digest. Thus inactivating the row. We also remove all watchers from
     * child scopes recursively storing them on each child in a separate variable to activation later.
     * They need to be reactivated before being destroyed for proper cleanup.
     * $$childHead and $$nextSibling variables are also updated for angular so that it will not even iterate
     * over a scope that is deactivated. It becomes completely hidden from the digest.
     * @param {Scope} s
     * @returns {boolean}
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
     * ###<a name="activateScope">activateScope</a>###
     * Taking a scope that is deactivated the watchers that it did have are now stored on $$$watchers and
     * can be put back to $$watchers so angular will pick up this scope on a digest. This is done recursively
     * though child scopes as well to activate them. It also updates the linking $$childHead and $$nextSiblings
     * to fully make sure the scope is as if it was before it was deactivated.
     * @param {Scope} s
     * @returns {boolean}
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

    /**
     * ###<a name="isActive">isActive</a>###
     * Check a scope by index to see if it is active.
     * @param {Number} index
     * @returns {boolean}
     */
    function isActive(index) {
        var s = scopes[index];
        return !!(s && !s.$$$watchers); // if it has $$$watchers it is deactivated.
    }

    /**
     * ###<a name="getOffsetIndex">getOffsetIndex</a>###
     * Given a scroll offset, get the index that is closest to that scroll offset value.
     * @param {Number} offset
     * @returns {number}
     */
    function getOffsetIndex(offset) {
        // updateHeightValues must be called before this.
        var est = Math.floor(offset / inst.templateModel.averageTemplateHeight()),
            i = 0;
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
        var height = viewHeight,
            result = {
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
        options.rowHeight = inst.rowsLength ? inst.templateModel.getTemplateHeight('default') : 0;
    }

    /**
     * ###<a name="updateRowWatchers">updateRowWatchers</a>###
     * This is the core of the datagird rendering. It determines the range of scopes to be activated and
     * deactivates any scopes that were active before that are not still active.
     */
    function updateRowWatchers() {
        var loop = getStartingIndex(), offset = loop.i * 40, lastActive = [].concat(active),
            lastActiveIndex, s, prevS;
        if (loop.i < 0) {// then scroll is negative. ignore it.
            return;
        }
        inst.dispatch(events.ON_BEFORE_UPDATE_WATCHERS, loop);
        // we only want to update stuff if we are scrolling slow.
        resetMinMax();// this needs to always be set after the dispatch of before update watchers in case they need the before activeRange.
        active.length = 0; // make sure not to reset until after getStartingIndex.
        inst.log("\tvisibleScrollStart %s visibleScrollEnd %s", loop.visibleScrollStart, loop.visibleScrollEnd);
        while (loop.i < inst.rowsLength) {
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
        inst.log("\tstartIndex %s endIndex %s", loop.startIndex, loop.i);
        deactivateList(lastActive);
        lastVisibleScrollStart = loop.visibleScrollStart;
        inst.log("\tactivated %s", active.join(', '));
        updateLinks(); // update the $$childHead and $$nextSibling values to keep digest loops at a minimum count.
        flow.add(safeDigest, [scope]);
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
        inst.log("\tdeactivated %s", deactivated.join(', '));
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
            if (tplHeight !== inst.templateModel.getTemplateHeight(inst.getData()[values.activeRange.min])) {
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
                inst.info(exports + ".datagrid is waiting for element to have a height.");
                flow.add(render, null, 0);// have it wait a moment for the height to change.
            } else {
                flow.warn("Datagrid: Unable to determine a height for the datagrid. Cannot render. Exiting.");
            }
            return false;
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
            inst.log("\trender %s", state);
            // Where [states.BUILDING](#states.BUILDING) is used
            if (state === states.BUILDING) {
                if (flow.length()) {
                    flow.insert(ready);
                    flow.insert(updateHeightValues);
                    flow.insert(buildRows, [inst.data], 0);
                } else {
                    flow.add(buildRows, [inst.data], 0);
                    flow.add(updateHeightValues);
                    flow.add(ready);
                }
            } else if (state === states.ON_READY) {
                inst.dispatch(exports.datagrid.events.ON_BEFORE_RENDER);
                flow.add(beforeRenderAfterDataChange);
                flow.add(updateRowWatchers);
                flow.add(afterRenderAfterDataChange);
                flow.add(destroyOldContent);
                flow.add(inst.dispatch, [exports.datagrid.events.ON_AFTER_RENDER]);
            } else {
                throw new Error("RENDER STATE INVALID");
            }
        } else {
            inst.log("\tnot ready to render.");
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
        dispatch(exports.datagrid.events.ON_BEFORE_DATA_CHANGE);
        values.dirty = true;
        inst.log("dataChanged");
        inst.grouped = scope.$eval(attr.grouped);
        inst.data = inst.setData((newVal || attr.list), inst.grouped) || [];
        dispatch(exports.datagrid.events.ON_AFTER_DATA_CHANGE);
        flow.add(reset);
    }

    /**
     * ###<a name="reset">reset</a>###
     * clear all and rebuild.
     */
    function reset() {
        dispatch(exports.datagrid.events.ON_BEFORE_RESET);
        state = states.BUILDING;
        destroyScopes();
        // now destroy all of the dom.
        rowOffsets = {};
        active.length = 0;
        scopes.length = 0;
        // keep reference to the old content and add a class to it so we can tell it is old. We will remove it after the render.
        oldContent = content;
        oldContent.addClass('old-content');
        oldContent.children().unbind();
        // make sure scopes are destroyed before this level and listeners as well or this will create a memory leak.
        inst.chunkModel.reset();
        flow.add(updateViewportHeight);
        flow.add(render);
        flow.add(dispatch, [exports.datagrid.events.ON_AFTER_RESET]);
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
     * the <a href="#activeRange">activeRange</a>
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
        var index = inst.getNormalizedIndex(item),
            el = getRowElm(index), s = el.hasClass(options.uncompiledClass) ? compileRow(index) : el.scope();
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
        flow.add(inst.chunkModel.updateAllChunkHeights, [rowIndex]);
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
        if (!isLogEvent(event)) eventLogger.log('$emit %s', event);// THIS SHOULD ONLY EMIT. Broadcast could perform very poorly especially if there are a lot of rows.
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
        each(scopes, function (s, index) {
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
        scope.datagrid = null; // we have a circular reference. break it on destroy.
        inst.log('destroying grid');
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
            if (inst[i] && inst[i].hasOwnProperty('destroy')) {
                inst[i].destroy();
                inst[i] = null;
            }
        }
        //activate scopes so they can be destroyed by angular.
        destroyScopes();
        element.remove();// this seems to be the most memory efficient way to remove elements.
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

    exports.logWrapper('datagrid', inst, 'green', dispatch);
    setupExports();

    return inst;
}

/**
 * ###<a name="uxDatagrid">uxDatagrid</a>###
 * define the directive, setup addons, apply core addons then optional addons.
 */
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
