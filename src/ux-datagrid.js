/*global each, charPack, Flow, exports, module */

/**
 * <a name="ux.datagrid"></a>
 * ##Datagrid Directive##
 * The datagrid manages the `core addons` to build the initial list and provide the public API necessary
 * to communicate with other addons.
 * Datagrid uses script templates inside of the DOM to create your elements. Addons are added to the `addon`
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
    // **<a name="waitCount">waitCount</a>** waiting to render. If it fails too many times it will die.
    var waitCount = 0;
    // **<a name="changeWatcherSet">changeWatcherSet</a>** flag for change watchers.
    var changeWatcherSet = false;
    // **<a name="unwatchers">unwatchers</a>** list of scope listeners that we want to clear on destroy
    var unwatchers = [];
    // **<a name="content">content</a>** the DOM element with all of the chunks.
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
        // - <a name="values.dirty"></a>if the data is dirty and a render has not happened since the data change.
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
        activeRange: {min: 0, max: 0}
    };
    // <a name="logEvents"></a>listing the log events so they can be ignored if needed.
    var logEvents = [exports.datagrid.events.LOG, exports.datagrid.events.INFO, exports.datagrid.events.WARN, exports.datagrid.events.ERROR];
    // <a name="inst"></a>the instance of the datagrid that will be referenced by all addons.
    var inst = {}, eventLogger = {}, startupComplete = false, gcIntv;

    // wrap the instance for logging.
    exports.logWrapper('datagrid event', inst, 'grey', dispatch);

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
     * Build out the public API variables for the datagrid.
     */
    function setupExports() {
        inst.uid = exports.uid();
        inst.name = scope.$eval(attr.gridName) || 'datagrid';
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
        inst.render = function () {
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
        inst.getExistingRow = getExistingRow;
        inst.getRowIndex = inst.getIndexOf = getRowIndex;
        inst.getRowOffset = getRowOffset;
        inst.getRowHeight = getRowHeight;
        inst.getViewportHeight = getViewportHeight;
        inst.getContentHeight = getContentHeight;
        inst.getContent = getContent;
        inst.isDigesting = isDigesting;
        inst.safeDigest = safeDigest;
        inst.getRowIndexFromElement = getRowIndexFromElement;
        inst.updateViewportHeight = updateViewportHeight;
        inst.calculateViewportHeight = calculateViewportHeight;
        inst.options = options = exports.extend({}, exports.datagrid.options, scope.$eval(attr.options) || {});
        inst.flow = flow = new Flow({async: Object.prototype.hasOwnProperty.apply(options, ['async']) ? !!options.async : true, debug: Object.prototype.hasOwnProperty.apply(options, ['debug']) ? options.debug : 0}, inst.dispatch);
        // this needs to be set immediatly so that it will be available to other views.
        inst.grouped = scope.$eval(attr.grouped);
        inst.gc = forceGarbageCollection;
        flow.add(init);// initialize core.
        flow.run();// start the flow manager.
    }

    /**
     * ###<a name="createContent">createContent</a>###
     * The [content](#content) DOM element is the only direct child created by the datagrid.
     * It is used to append all of the `chunks` so that it can be scrolled.
     * If the DOM element is provided with the class [content](#content) then that DOM element will be used
     * allowing the user to add custom classes directly to the [content](#content) DOM element.
     * @returns {JQLite}
     */
    function createContent() {
        var contents = element[0].getElementsByClassName(options.contentClass), cnt, classes = options.contentClass;
        contents = exports.filter(contents, filterOldContent);
        cnt = contents[0];
        if (cnt) { // if there is an old one. Pull the classes from it.
            classes = cnt.className || options.contentClass;
        }
        if (!cnt) {
            classes = getClassesFromOldContent() || classes;
            cnt = angular.element('<div class="' + classes + '"></div>');
            if (inst.options.chunks.detachDom) {
                cnt[0].style.position = 'relative';
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
     * If the old content exists it may have been an original DOM element passed to the datagrid. If so we want
     * to keep that DOM element's classes in tact.
     * @returns {string}
     */
    function getClassesFromOldContent() {
        var classes, index;
        if (oldContent) {// let's get classes from it.
            classes = exports.util.array.toArray(oldContent[0].classList);
            index = classes.indexOf('old-' + options.contentClass);
            if (index !== -1) {
                classes.splice(index, 1);
            }
            return classes.join(' ');
        }
    }

    /**
     * ###<a name="filterOldContent">filterOldContent</a>###
     * filter the list of content DOM to remove any references to the [oldContent][#oldContent].
     * @param cnt
     * @param index
     * @param list
     * @returns {boolean}
     */
    function filterOldContent(cnt, index, list) {
        return angular.element(cnt).hasClass('old-' + options.contentClass) ? false : true;
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
                // if they are doing custom compiling. They may compile before adding it to the DOM.
                // allow a pass to happen just in case.
                flow.add(waitForElementReady, [count + 1], 0);// retry.
                return;
            } else {
                flow.warn("Datagrid: DOM Element does not have a height.");
            }
        }
        if (options.templateModel && options.templateModel.templates) {
            flow.add(inst.templateModel.createTemplatesFromData, [options.templateModel.templates], 0);
        }
        flow.add(inst.templateModel.createTemplates, null, 0); // allow element to be added to DOM.
        // if the templates have different heights then they are dynamic.
        flow.add(function updateDynamicRowHeights() {
            options.dynamicRowHeights = inst.templateModel.dynamicHeights();
        });
        flow.add(addListeners);
    }

    /**
     * ###<a name="addListeners">addListeners</a>###
     * Adds listeners. Notice that all listeners are added to the unwatchers array so that they can be cleared
     * before references are removed to avoid memory leaks with circular references and to prevent events from
     * being listened to while the destroy is happening.
     */
    function addListeners() {
        var unwatchFirstRender = scope.$on(exports.datagrid.events.ON_BEFORE_RENDER_AFTER_DATA_CHANGE, function () {
            unwatchFirstRender();
            flow.add(onStartupComplete);
        });
        window.addEventListener('resize', onResize);
        unwatchers.push(scope.$on(exports.datagrid.events.UPDATE, update));
        unwatchers.push(scope.$on(exports.datagrid.events.ON_ROW_TEMPLATE_CHANGE, onRowTemplateChange));
        unwatchers.push(scope.$on('$destroy', destroy));
        flow.add(setupChangeWatcher, [], 0);
        inst.dispatch(exports.datagrid.events.ON_LISTENERS_READY);
    }

    function isStartupComplete() {
        return startupComplete;
    }

    function onStartupComplete() {
        startupComplete = true;
        dispatch(exports.datagrid.events.ON_STARTUP_COMPLETE, inst);
    }

    /**
     * ###<a name="setupChangeWatcher">setupChangeWatcher</a>###
     * When a change happens update the DOM.
     */
    function setupChangeWatcher() {
        if (!changeWatcherSet) {
            inst.log("setupChangeWatcher");
            changeWatcherSet = true;
            unwatchers.push(scope.$watchCollection(attr.uxDatagrid, onDataChangeFromWatcher));
            // force initial watcher.
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
     * Calculate Viewport Height can be expensive. Depending on the number of DOM elements.
     * so if you need to use this method, use it sparingly because you may experience performance
     * issues if overused.
     */
    function calculateViewportHeight() {
        return element[0].offsetHeight;
    }

    /**
     * ###<a name="onResize">onResize</a>###
     * When a resize happens dispatch that event for addons to listen to so events happen after
     * the grid has performed its changes.
     * @param {Event} event
     */
    function onResize(event) {
        forceRedraw();
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
        if (Object.prototype.hasOwnProperty.apply(inst.data, [index])) {
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
     * Return the DOM element at that row index.
     * @param {Number} index
     * @returns {element|*}
     */
    function getRowElm(index) {
        return angular.element(inst.chunkModel.getRow(index));
    }

    /**
     * ###<a name="getExistingRow">getExistingRow</a>###
     * Return the DOM element at that row index. This will not build it if it doesn't exist.
     * @param {Number} index
     * @returns {element|*}
     */
    function getExistingRow(index) {
        return angular.element(inst.chunkModel.getExistingRow(index));
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
     * Get the index of a row from a reference to a DOM element that is contained within a row.
     * @param {JQLite|DOMElement} el
     * @returns {*}
     */
    function getRowIndexFromElement(el) {
        if (element[0].contains(el[0] || el)) {
            el = el.scope ? el : angular.element(el);
            var s = el.scope();
            if (s === inst.scope) {
                throw new Error("Unable to get row scope... something went wrong.");
                // This is only likely to happen if we are running in options.chunks.detachDom mode. And only
                // when jumping from one chunk to the next in detached mode.
                // this means that the scope of the element isn't active. So it is picking up the parent.
                // that's ok. We have a backup plan. It just isn't as fast.
//                while (el.length && !el[0].getAttribute('row-id')) {
//                    el = el.parent();// moving up dom parents in the browser is slow. So we avoid it if we can.
//                }
//                return parseInt(el[0].getAttribute('row-id'), 10);
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
     * Return the scroll offset of a row by its index. All offsets are cached. They get updated if
     * a row template changes, because it may change the height as well.
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
        var list = inst.chunkModel.getChunkList();
        return list && list.height || 0;
    }

    /**
     * ###<a name="createDom">createDom</a>###
     * This starts off the chunking. It creates all of the DOM chunks, rows, etc for the datagrid.
     * @param {Array} list
     */
    function createDom(list) {
        //TODO: if there is any dom. It needs destroyed first.
        inst.log("OVERWRITE DOM!!!");
        var len = list.length;
        // this async is important because it allows the updateRowWatchers on first digest to escape the current digest.
        inst.chunkModel.chunkDom(list, options.chunks.size, '<div class="' + options.chunks.chunkClass + '">', '</div>', content);
        inst.rowsLength = len;
        inst.log("created %s dom elements", len);
    }

    /**
     * ###<a name="compileRow">compileRow</a>###
     * Compile a row at that index. This creates the scope for that row when compiled. It does not perform a digest.
     * @param {Number} index
     * @param {Object=} el
     * @returns {*}
     */
    function compileRow(index, el) {
        var s = scopes[index], prev, tpl;
        if (s && !s.$parent) {
            throw new Error("Scope without a parent");
        }
        if (!s) {
            s = scope.$new();
            prev = getScope(index - 1);
            tpl = inst.templateModel.getTemplate(inst.data[index]);
            if (prev) {
                prev.$$nextSibling = s;
                s.$$prevSibling = prev;
            }
            s.$status = options.compiledClass;
            s[tpl.item] = inst.data[index]; // set the data to the scope.
            s.$index = index;
            scopes[index] = s;
            el = el || getRowElm(index);
            el.removeClass(options.uncompiledClass);
            $compile(el)(s);
            inst.dispatch(exports.datagrid.events.ON_ROW_COMPILE, s, el);
            deactivateScope(s, index);
        }
        return s;
    }

    /**
     * ###<a name="buildRows">buildRows</a>###
     * Set the state to <a name="states.BUILDING">states.BUILDING</a>. Then build the DOM.
     * @param {Array} list
     * @param {Boolean=} forceRender
     */
    function buildRows(list, forceRender) {
        inst.log("\tbuildRows %s", list.length);
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
     * Set the state to <a href="states.READY">states.READY</a> and start the first render.
     */
    function ready() {
        inst.log("\tready");
        state = states.READY;
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

    function isDigesting(s) {
        var ds = s;
        while (ds) {
            if (ds.$$phase) {
                return true;
            }
            ds = ds.$parent;
        }
        return false;
    }

    /**
     * ###<a name="safeDigest">safeDigest</a>###
     * SafeDigest by checking the render phase of the scope before rendering.
     * while this is not recommended by angular it is effective.
     * @param {Scope} s
     */
    function safeDigest(s) {
//        s.$evalAsync();// this sometimes takes too long so I see {{}} brackets briefly.
        if (!isDigesting(s)) {
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
                if (Object.prototype.hasOwnProperty.apply(listenerCounts, [eventName])) {
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
     * ###<a name="deactivateScope">deactivateScope</a>###
     * One of the core features to the datagrid's performance is the ability to make only the scopes
     * that are in view to render. This deactivates a scope by removing its $$watchers that angular
     * uses to know that it needs to digest. Thus inactivating the row. We also remove all watchers from
     * child scopes recursively storing them on each child in a separate variable to activate later.
     * They need to be reactivated before being destroyed for proper cleanup.
     * $$childHead and $$nextSibling variables are also updated for angular so that it will not even iterate
     * over a scope that is deactivated. It becomes completely hidden from the digest.
     * @param {Scope} s
     * @param {number} index
     * @returns {boolean}
     */
    function deactivateScope(s, index) {
        // if the scope is not created yet. just skip.
        if (s && !isActive(s)) { // do not deactivate one that is already deactivated.
            s.$emit(exports.datagrid.events.ON_BEFORE_ROW_DEACTIVATE);
            s.$$$watchers = s.$$watchers;
            s.$$watchers = [];
            s.$$$listenerCount = s.$$listenerCount;
            s.$$listenerCount = angular.copy(s.$$$listenerCount);
            subtractEvents(s, s.$$$listenerCount);
            if (index >= 0) {
                s.$$nextSibling = null;
                s.$$prevSibling = null;
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
     * @param {number} index
     * @returns {boolean}
     */
    function activateScope(s, index) {
        if (s && s.$$$watchers) { // do not activate one that is already active.
            s.$$watchers = s.$$$watchers;
            delete s.$$$watchers;
            addEvents(s, s.$$$listenerCount);
            delete s.$$$listenerCount;
            if (index >= 0) {
                s.$$nextSibling = scopes[index + 1];
                s.$$prevSibling = scopes[index - 1];
                s.$parent = scope;
            }
            s.$emit(exports.datagrid.events.ON_AFTER_ROW_ACTIVATE);
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
            i = 0, len = inst.rowsLength;
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
     * Because the datagrid can render as many as 50k rows it becomes necessary to optimize loops by
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
        var height = viewHeight,
            scroll = values.scroll >= 0 ? values.scroll : 0,
            result = {
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
        options.rowHeight = inst.rowsLength ? inst.templateModel.getTemplateHeight('default') : 0;
        contentHeight = getContentHeight();
        inst.getContent()[0].style.height = contentHeight + 'px';
        inst.log("heights: viewport %s content %s", inst.getViewportHeight(), contentHeight);
    }

    /**
     * ###<a name="updateRowWatchers">updateRowWatchers</a>###
     * This is the core of the datagird rendering. It determines the range of scopes to be activated and
     * deactivates any scopes that were active before that are not still active.
     */
    function updateRowWatchers() {
        var loop = getStartingIndex(), offset, lastActive = [].concat(active),
            lastActiveIndex, s, prevS, digestLater = false;
        if (loop.i < 0) {// then scroll is negative. ignore it.
            return;
        }
        inst.dispatch(events.ON_BEFORE_UPDATE_WATCHERS, loop);
        // we only want to update stuff if we are scrolling slow.
        resetMinMax();// this needs to always be set after the dispatch of before update watchers in case they need the before activeRange.
        active.length = 0; // make sure not to reset until after getStartingIndex.
        inst.log("\tscroll %s visibleScrollStart %s visibleScrollEnd %s", values.scroll, loop.visibleScrollStart, loop.visibleScrollEnd);
        while (loop.i < inst.rowsLength) {
            prevS = scope.$$childHead ? scopes[loop.i - 1] : null;
            offset = getRowOffset(loop.i); // this is where the chunks and rows get created is when they are requested if they don't exist.
            if ((offset >= loop.visibleScrollStart && offset <= loop.visibleScrollEnd)) {
                s = compileRow(loop.i); // only compiles if it is not already compiled. Still returns the scope.
                if (loop.started === undefined) {
                    loop.started = loop.i;
                }
                updateMinMax(loop.i);
                if (activateScope(s, loop.i)) {
                    inst.getRowElm(loop.i).attr('status', 'active');
                    lastActiveIndex = lastActive.indexOf(loop.i);
                    if (lastActiveIndex !== -1) {
                        lastActive.splice(lastActiveIndex, 1);
                    }
                    // make sure to put them into active in the right order.
                    active.push(loop.i);
                    if (!safeDigest(s, true)) {
                        digestLater = true;
                    }
                    s.$digested = true;
                }
            }
            loop.i += loop.inc;
            // optimize the loop
            if ((loop.inc > 0 && offset > loop.visibleScrollEnd) || (loop.inc < 0 && offset < loop.visibleScrollStart)) {
                break; // optimize the loop to escape when we get past the active area.
            }
        }
        loop.ended = loop.i - 1;
        if (inst.rowsLength && values.activeRange.min < 0 && values.activeRange.max < 0) {
            throw new Error(exports.errors.E1002);
        }
        inst.log("\tstartIndex %s endIndex %s", loop.startIndex, loop.i);
        deactivateList(lastActive);
        lastVisibleScrollStart = loop.visibleScrollStart;
        inst.log("\tactivated %s", active.join(', '));
        updateLinks(); // update the $$childHead and $$nextSibling values to keep digest loops at a minimum count.
        // this dispatch needs to be after the digest so that it doesn't cause {} to show up in the render.
        // the creep render cannot be synchronous. It needs to wait till done to render.
        flow.add(onAfterUpdateWatchers, [loop], 0);
        if (digestLater) {
            flow.add(function () {
                safeDigest(scope);
            });
        }
    }

    function onAfterUpdateWatchers(loop) {
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
            deactivateScope(scopes[lastActiveIndex], lastActiveIndex);
            inst.getRowElm(lastActiveIndex).attr('status', 'inactive');
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

    function whenReadyToRender() {
        flow.add(inst.updateViewportHeight, null, 0);// have it wait a moment for the height to change.
        flow.add(render);
    }

    /**
     * ###<a name="readyToRender">readyToRender</a>###
     * the datagrid requires a height to be able to render. If the datagrid is compiled
     * and not added to the DOM it will not have a height until added to the DOM. If this fails it will wait until the next
     * frame to check the height. If that fails it exits.
     */
    function readyToRender() {
        if (!viewHeight) {
            waitCount += 1;
            if (waitCount < inst.options.readyToRenderRetryMax) {
                inst.info("datagrid is waiting for element to have a height.");
                var unwatch = scope.$watch(function() {
                    unwatch();
                    readyToRender();
                });
                whenReadyToRender();
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
     * depending on the state of the datagrid this will create necessary DOM, compile rows, or
     * digest <a href="#activeRange">activeRange</a> of rows.
     */
    function render() {
        inst.log("render");
        if (readyToRender()) {
            waitCount = 0;
            inst.log("\trender %s", state);
            // Where [states.BUILDING](#states.BUILDING) is used
            if (state === states.BUILDING) {
                buildRows(inst.data);
            } else if (state === states.READY) {
                inst.dispatch(exports.datagrid.events.ON_BEFORE_RENDER);
                flow.add(beforeRenderAfterDataChange);
                flow.add(updateRowWatchers);
                // this wait allows rows to finish calculating their heights and finish the digest before firing.
                flow.add(afterRenderAfterDataChange);
//                flow.add(destroyOldContent);
                flow.add(inst.dispatch, [exports.datagrid.events.ON_AFTER_RENDER]);
            } else {
                throw new Error(exports.errors.E1001);
            }
        } else {
            inst.log("\tnot ready to render.");
        }
    }

    /**
     * ###<a name="update">update</a>###
     * force the datagrid to fire a data change update or fire a redraw if that fails.
     */
    function update() {
        inst.warn("force update");
        if (!onDataChanged(scope.$eval(attr.uxDatagrid), inst.data)) {
            forceRedraw();
        }
    }

    /**
     * ###<a name="forceUpdate">forceUpdate</a>###
     * force the datagrid to fire a data change update.
     */
    function forceRedraw() {
        // we need to wait a moment for the browser to finish the resize, then adjust and fire the event.
        flow.add(updateHeights, [], 100);
    }

    /**
     * ###<a name="dirtyCheckData">dirtyCheckData</a>###
     * Compare the new and the old value. If the item number is the same, and no templates
     * have changed then just update the scopes and run the watchers instead of doing a reset.
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
                inst.log("\tdirtyCheckData length is different");
                return true;
            }
            return false;
        }
        return true; // lengths do not match.
    }

    /**
     * ###<a name="dirtyCheckItemTemplate">dirtyCheckItemTemplate</a>###
     * check to see if the template for the item has changed
     * @param {*} newItem
     * @param {*} oldItem
     */
    function dirtyCheckItemTemplate(newItem, oldItem) {
        if (inst.templateModel.getTemplate(newItem) !== inst.templateModel.getTemplate(oldItem)) {
            inst.log("\tdirtyCheckData row template changed");
            return true;
        }
        return false;
    }

    /**
     * ###<a name="mapData">mapData</a>###
     * map the new data to the old data object and update the scopes.
     */
    function mapData(newVal, oldVal) {
//TODO: there is some error here that is causing the rows now not to compile.
        inst.log("\tmapData()");
        var oldTemplates = [];// get temp cache for templates
        exports.each(inst.getData(), cacheOldTemplates, oldTemplates);
        inst.data = inst.setData(newVal, inst.grouped) || [];
        inst.chunkModel.updateList(inst.data);
        exports.each(inst.getData(), updateScope, oldTemplates);
        oldTemplates = null; // clear temp cache for templates.
        dispatch(exports.datagrid.events.ON_AFTER_DATA_CHANGE, inst.data, oldVal);
    }

    /**
     * ###<a name="cacheOldTemplates>cacheOldTemplates</a>###
     * temporarily cache old templates for mapping so we can tell if a template changed
     * when a scope changed.
     * @param item
     * @param index
     * @param list
     * @param cache
     */
    function cacheOldTemplates(item, index, list, cache) {
        cache[index] = inst.templateModel.getTemplate(item);
    }

    /**
     * ###<a name="updateScope">updateScope</a>###
     * update the scope at that index with the new item.
     */
    function updateScope(item, index, list, oldTemplates) {
        var tpl, oldTemplate;
        if (scopes[index]) {
//            console.log("update scope %s", index);
            oldTemplate = oldTemplates[index];
            delete scopes[index][oldTemplate.item];
            tpl = inst.templateModel.getTemplate(item);
            scopes[index][tpl.item] = item;
            if (tpl !== oldTemplates[index]) {
//                console.log("\treplace %s %s %s", index, oldTemplate.height, tpl.height);
                onRowTemplateChange({}, item, oldTemplates[index].name, tpl.name, [], true);
            }
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
            flow.add(changeData, [newVal, oldVal]);
            return true;
        } else if (isDataReallyChanged(newVal)) {
            // we just want to update the data values and scope values, because no templates changed.
            values.dirty = true;
            mapData(newVal, oldVal);
            flow.add(updateHeights, [], 0);
            return true;
        }
        return false;
    }

    function isDataReallyChanged(newVal) {
        // loop through the data and make sure it hasn't already been updated by swap.
        var i = 0, norm = inst.normalize(newVal, inst.grouped), len = newVal.length;
        while (i < len) {
            if (inst.data[i] !== norm[i]) {
                return true;
            }
            i += 1;
        }
        return false;
    }

    function changeData(newVal, oldVal) {
        inst.log("\tchangeData");
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
        flow.clear();// we are going to clear all in the flow before doing a reset.
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
        flow.add(inst.info, ["reset complete"]);
        flow.add(dispatch, [exports.datagrid.events.ON_AFTER_RESET]);// removed delay here because it causes the blink in the datagrid update.
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
     * @param {*} item
     * @param {Object} oldTemplate
     * @param {Object} newTemplate
     * @param {Array} classes
     * @param {Boolean=} skipUpdateHeights - useful to turn off when doing multiple row template changes.
     */
    function onRowTemplateChange(evt, item, oldTemplate, newTemplate, classes, skipUpdateHeights) {
        var index = inst.getNormalizedIndex(item), el = getExistingRow(index),
            s = el.hasClass(options.uncompiledClass) ? compileRow(index) : el.scope(), replaceEl;
        if (s !== scope) {
            replaceEl = angular.element(inst.templateModel.getTemplateByName(newTemplate).template);
            replaceEl.addClass(options.uncompiledClass);
            while (classes && classes.length) {
                replaceEl.addClass(classes.shift());
            }
            el.parent()[0].replaceChild(replaceEl[0], el[0]);
            activateScope(s);
            el.remove();
            s.$destroy();
            scopes[index] = null;
            if (!skipUpdateHeights) {
                inst.chunkModel.updateRow(index, item);
                updateHeights(index);
            }
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
        flow.add(inst.chunkModel.updateAllChunkHeights, [rowIndex]);
        flow.add(updateHeightValues);
        flow.add(updateViewportHeight);
        flow.add(function () {
            var maxScrollHeight = inst.getContentHeight() - inst.getViewportHeight();
            if (values.scroll > maxScrollHeight) {
                values.scroll = maxScrollHeight;
            }
        });
        flow.add(inst.dispatch, [exports.datagrid.events.ON_AFTER_HEIGHTS_UPDATED]);
        flow.add(render);
        flow.add(inst.dispatch, [exports.datagrid.events.ON_AFTER_HEIGHTS_UPDATED_RENDER]);
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
     * handle dispatching of events from the datagrid.
     * @param {String} event
     * @returns {Object}
     */
    function dispatch(event) {
        if (!isLogEvent(event) && options.debug) eventLogger.log('$emit %s', event);// THIS SHOULD ONLY EMIT. Broadcast could perform very poorly especially if there are a lot of rows.
        return scope.$emit.apply(scope, arguments);
    }

    function forceGarbageCollection() {
        // concept is to create a large object that will cause the browser to garbage collect before creating it.
        // then since it has no reference it gets removed.
        clearInterval(gcIntv);
        if (!inst.shuttingDown) {
            gcIntv = setTimeout(function () {
                if (inst) {
                    inst.info("GC");
                    var a, i, total = (1024 * 1024 * 0.5);
                    for (i = 0; i < total; i += 1) {
                        a = 0.5;
                    }
                }
            }, 1000);
        }
    }

    /**
     * ###<a name="destroyScopes">destroyScopes</a>###
     * used to destroy the scopes of all rows in the datagrid that are compiled.
     */
    function destroyScopes() {
        // because child scopes may not be in order because of rendering techniques we must loop through
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
        inst.shuttingDown = true;
        getContent()[0].style.display = 'none';
        scope.datagrid = null; // we have a circular reference. break it on destroy.
        inst.log('destroying grid');
        window.removeEventListener('resize', onResize);
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
        logEvents = null;
        $compile = null;
    }

    exports.logWrapper('datagrid', inst, 'green', dispatch);
    exports.logWrapper('events', eventLogger, 'light', dispatch);
    scope.datagrid = inst;
    setupExports();

    return inst;
}

/**
 * ###<a name="uxDatagrid">uxDatagrid</a>###
 * define the directive, setup addons, apply core addons then optional addons.
 */
module.directive('uxDatagrid', ['$compile', 'gridAddons', function ($compile, gridAddons) {
    return {
        restrict: 'AE',
        scope: true,
        link: {
            pre: function (scope, element, attr) {
                var inst = new Datagrid(scope, element, attr, $compile);
                each(exports.datagrid.coreAddons, function (method) {
                    method.apply(inst, [inst]);
                });
                gridAddons(inst, attr.addons);
//                scope.$parent[inst.name] = inst;
            },
            post: function (scope, element, attr) {
                scope.datagrid.start();
            }
        }
    };
}]);
