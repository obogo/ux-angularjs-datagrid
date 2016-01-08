exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME = "ux-datagrid:focusToPrevElementOfSame";
exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME = "ux-datagrid:focusToNextElementOfSame";
exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME_FAILURE = "ux-datagrid:focusToPrevElementOfSameFailure";
exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME_FAILURE = "ux-datagrid:focusToNextElementOfSameFailure";
exports.datagrid.events.ON_SCROLL_TO_TOP_ENTER = "ux-datagrid:onScrollToTopEnter";
exports.datagrid.events.ON_SCROLL_TO_BOTTOM_ENTER = "ux-datagrid:onScrollToBottomEnter";
/**
 * ##<a name="gridFocusManager">gridFocusManager</a>##
 * Handle focus for enterKey to move down the correct columns.
 * > _**Note:** One of the most common mistakes when implementing this is to have classes that are applied on focus.
 * > Those get picked up in the selectors and then when it tries to find them in the next row they do not
 * > match because they are not focused or selected yet. You can easily get around this by applying [filterClasses](#filterClasses).
 * > [filterClasses](#filterClasses) are defined in the options of the datagrid._
 * > `data-options="{gridFocusManger: {filterClasses: ['focused','selected']}, filterNextPattern:{available:true}}"`
 * The filterNextPattern is used to speed up the lookup to the next item in focus. So it can quickly find which item to
 * scroll to before having to make sure the item is compiled and has a selector. It takes a pattern to match on.
 * See https://github.com/obogo/hummingbird/blob/master/src/utils/validators/isMatch.js for options with this pattern.
 */
angular.module('ux').factory('gridFocusManager', function () {
    return ['inst', function (inst) {

        /**
         * We want to add and remove listeners only on the dom that is currently under watch.
         */

        var result = exports.logWrapper('gridFocusManager', {}, 'redOrange', inst),
            unwatchers = [], keys = {ENTER: 13, UP: 38, DOWN: 40}, throttleIntv = 0;

        /**
         * ###<a name="wrap">wrap</a>###
         * if an element is not a JQLite element then make it one.
         * @param {JQLite|HTMLElement} el
         * @returns {JQLite}
         */
        function wrap(el) {
            if (el.length === undefined) {
                el = angular.element(el);
            }
            return el;
        }

        /**
         * ###<a name="addListeners">addListeners</a>###
         * Add all of the listeners to the visible rows.
         */
        function addListeners() {
            result.log("addListeners");
            applyToListeners(addListenersToRow);
        }

        /**
         * ###<a name="removeListeners">removeListeners</a>###
         * remove all of the listeners from min to max.
         */
        function removeListeners() {// this needs executed before the activeRange changes.
            result.log("removeListeners");
            applyToListeners(removeListenersToRow);
        }

        /**
         * ###<a name="applyToListeners">applyToListeners</a>###
         * using the inst.activeRange.min/max apply methods to those rows.
         * @param {Function} method
         */
        function applyToListeners(method) {
            if (isNaN(inst.values.activeRange.max) || inst.values.activeRange.max < 0) {
                return;// prevent undefined or negative numbers. Can be index 0.
            }
            result.log("\tapplyTo: %s - %s", inst.values.activeRange.min, inst.values.activeRange.max);
            var i = inst.values.activeRange.min, row;
            while (i <= inst.values.activeRange.max) {
                row = inst.getRowElm(i);
                method(row);
                i += 1;
            }
        }

        /**
         * ###<a name="getFocusableElements">getFocusableElements</a>###
         * Get all of the focusable elements within an element
         * @param {JQLite} el
         * @returns {Array}
         */
        function getFocusableElements(el) {
            if (el && el[0]) {// detachDom and memoryOptimizer can cause this to be null at times.
                var focusable = [].slice.call(el[0].querySelectorAll('input,a,select'));
    //            result.log("\tgetFocusableElements %s", focusable.length);
                return ux.filter(focusable, filterVisible);
            }
            return [];
        }

        /**
         * ###<a name="filterVisible">filterVisible</a>###
         * Filter the elements in the selection to only get those that are visible.
         * @param {HTMLElement} el
         * @returns {*}
         */
        function filterVisible(el) {
//            result.log("\t\tisVisible %s", ux.visibility.isVisible(el));
            return ux.visibility.isVisible(el, inst.getContent()[0], true);
        }

        /**
         * ###<a name="getRowElmFromChildElm">getRowElmFromChildElm</a>###
         * Move up the dom to determine the row of an element.
         * @param {JQLite} el
         * @returns {*}
         */
        function getRowElmFromChildElm(el) {
            // keep moving up until the parent is a chunk.
            var parent = el.parent();
            while (parent && !parent.hasClass(inst.options.chunkClass)) {
                el = parent;
                parent = el.parent();
            }
            return el;
        }

        /**
         * ###<a name="query">query</a>###
         * Similar to jquery find.
         * @param {JQLite|HTMLElement} el
         * @param {String} selector
         * @returns {JQLite}
         */
        function query(el, selector) {
            var filters = selector.split(':'), sel = filters.shift(),
                result = [].slice.call((el[0] || el).querySelectorAll(sel));
            while (filters.length) {
                result = filterSelection(filters.shift(), result);
            }
            return angular.element(result);
        }

        /**
         * ###<a name="filterSelection">filterSelection</a>###
         * Apply filters to the selection array.
         * @param {String} filterStr
         * @param {Array} elements
         * @returns {Array}
         */
        function filterSelection(filterStr, elements) {
            if (filterStr.substr(0, 3) === 'eq(') {
                return filterEq(filterStr, elements);
            } else if (filterStr.substr(0, 7) === 'visible') {
                return ux.filter(elements, filterVisible);
            }
            return elements;
        }

        /**
         * ###<a name="filterEq">filterEq</a>###
         * Filter for eq.
         * @param {String} filterStr
         * @param {Array} elements
         * @returns {Array}
         */
        function filterEq(filterStr, elements) {
            var index = filterStr.match(/\d+/)[0];
            return elements[index] ? [elements[index]] : [];
        }

        /**
         * ###<a name="isNgClass">isNgClass</a>###
         * Detect if is an ng-* class from the selectors.
         * @param {String} cls
         * @returns {boolean}
         */
        function isNgClass(cls) {
            return !!(cls && cls.substr(0, 3) === 'ng-');
        }

        /**
         * ###<a name="filterClasses">filterClasses</a>###
         * Filter out classes that are not supposed to be part of the selection.
         * By defining options.gridFocusManager.filterClasses as an array of class names to omit from the selection
         * you can filter these out from causing selections to not be made.
         * @param {String} cls
         * @returns {boolean}
         */
        //      <div ux-datagrid="items" addons="gridFocusManager" options="{gridFocusManager: {filterClasses: ['focus','selected','highlight']}}">...</div>
        function filterClasses(cls) {
            var isToBeFiltered = cls ? false : true;
            if (!isToBeFiltered && inst.options.gridFocusManager && inst.options.gridFocusManager.filterClasses) {
                isToBeFiltered = (inst.options.gridFocusManager.filterClasses.indexOf(cls) !== -1);
            }
            if (!isToBeFiltered) {
                isToBeFiltered = isNgClass(cls);
            }
            return !isToBeFiltered;
        }

        /**
         * ###<a name="addListenersToRow">addListenersToRow</a>###
         * Apply event listeners to the row.
         * @param {JQLite|HTMLElement} rowElm
         */
        function addListenersToRow(rowElm) {
            var focusable = getFocusableElements(angular.element(rowElm));
            if (focusable.length && (focusable = exports.util.matchAll(focusable, {nodeName:"INPUT"})).length) {// only add keydown to input fields
                result.log("\t\taddListenersToRow");
                focusable = angular.element(focusable);
                focusable.bind('keydown', onKeyDown);
            } else {
                result.log("\t\tno focusable elements found in row");
            }
        }

        /**
         * ###<a name="removeListenersToRow">removeListenersToRow</a>###
         * Remove event listeners from that row.
         * @param {JQLite|HTMLElement} rowElm
         */
        function removeListenersToRow(rowElm) {
            var focusable = getFocusableElements(angular.element(rowElm));
            if (focusable.length && (focusable = exports.util.matchAll(focusable, {nodeName:"INPUT"})).length) {// only add keydown to input fields
                result.log("\t\tremoveListenersToRow");
                focusable = angular.element(focusable);
                focusable.unbind('keydown', onKeyDown);
            } else {
                result.log("\t\tno focusable elements found in row");
            }
        }

        /**
         * ###<a name="onKeyDown">onKeyDown</a>###
         * Handle Enter, up/down key events.
         * @param {Event} event
         */
        function onKeyDown(event) {
            var target = angular.element(event.currentTarget), atTop = false, atBottom = false;
            var index;
            var item;
            result.log('FM: onKeyDown');
            if (event.keyCode === keys.ENTER && event.currentTarget.nodeName.match(/A/)) {
                // on anchors we allow enter to execute it. So ignore it.
                return;
            }
            if ((event.shiftKey && event.keyCode === keys.ENTER) || event.keyCode === keys.UP) {
                atTop = !focusToPrevRowElement(target);
                if (atTop) {
                    index = inst.getRowIndexFromElement(target);
                    item = inst.getRowItem(index);
                    inst.dispatch(exports.datagrid.events.ON_SCROLL_TO_TOP_ENTER, index, item);
                }
            } else if (event.keyCode === keys.ENTER || event.keyCode === keys.DOWN) {
                atBottom = !focusToNextRowElement(target);
                if (atBottom) {
                    index = inst.getRowIndexFromElement(target);
                    item = inst.getRowItem(index);
                    inst.dispatch(exports.datagrid.events.ON_SCROLL_TO_BOTTOM_ENTER, index, item);
                }
            }
        }

        /**
         * ###<a name="focusToPrevRowElement">focusToPrevRowElement</a>###
         * Focus to the previous row element from the current focused element.
         * @param {JQLite} focusedEl
         */
        function focusToPrevRowElement(focusedEl) {
            var focusEl = getPrevRowFocusElement(focusedEl, -1);
            if (isSame(focusEl, focusedEl)) {
                return false;
            }
            return performFocus(focusEl);
        }

        /**
         * ###<a name="focusToNextRowElement">focusToNextRowElement</a>###
         * Focus to the next row element from the current focused element.
         * @param {JQLite} focusedEl
         */
        function focusToNextRowElement(focusedEl) {
            var focusEl = getNextRowFocusElement(focusedEl);
            if (isSame(focusEl, focusedEl)) {
                return false;
            }
            return performFocus(focusEl);
        }

        /**
         * ###<a name="isSame">isSame</a>###
         * Compare to JQLite/HTMLElements objects to see if they reference the same HTMLElement.
         * @param {JQLite|HTMLElement} el
         * @param {JQLite|HTMLElement} el2
         * @returns {boolean}
         */
        function isSame(el, el2) {
            return (el[0] || el) === (el2[0] || el2);
        }

        /**
         * ###<a name="hasPrevRowFocusElement">hasPrevRowFocusElement</a>###
         * check to see if the previous row has the same selector which is derived from the focusedEl
         * @param {HTMLElement} focusedEl
         * @returns {boolean}
         */
        function hasPrevRowFocusElement(focusedEl) {
            var el = getPrevRowFocusElement(focusedEl);
            return !!(el && el.length && el[0] !== focusedEl);
        }

        /**
         * ###<a name="hasNextRowFocusElement">hasNextRowFocusElement</a>###
         * check to see if the next row has the same selector which is derived from the focusedEl
         * @param {HTMLElement} focusedEl
         * @returns {boolean}
         */
        function hasNextRowFocusElement(focusedEl) {
            var el = getNextRowFocusElement(focusedEl);
            return !!(el && el.length && el[0] !== focusedEl);
        }

        /**
         * ###<a name="getPrevRowFocusElement">getPrevRowFocusElement</a>###
         * get the previous row and check for the focusedEl selector.
         * @param {JQLite} focusedEl
         * @returns {*}
         */
        function getPrevRowFocusElement(focusedEl) {
            return focusToRowElement(focusedEl, -1);
        }

        /**
         * ###<a name="getNextRowFocusElement">getNextRowFocusElement</a>###
         * @param {JQLite} focusedEl
         * @returns {*}
         */
        function getNextRowFocusElement(focusedEl) {
            result.log("\tFM: getNextRowFocusElement");
            return focusToRowElement(focusedEl, 1);
        }

        /**
         * ###<a name="focusToRowElment">focusToRowElement</a>###
         * Do the heavy lifting for focusing from one row to the next and pulling the selector.
         * Since it is the same going to previous or next it is all one method and just needs to know which direction
         * to increment.
         * @param {JQLite} focusedEl
         * @param {Number} dir
         */
        function focusToRowElement(focusedEl, dir) { // dir should be 1 or -1
            result.log("\tfocusToRowElement");
            focusedEl = wrap(focusedEl);
            if (!inst.element[0].contains(focusedEl[0])) {
                return; // the focusedEl is not inside the datagrid.
            }
            var resultEl,
                currentIndex = inst.getRowIndexFromElement(focusedEl),
                nextIndex = currentIndex + dir, selector;
            if (nextIndex < 0 || nextIndex >= inst.rowsLength) {
                return focusedEl;
            }
            selector = getSelector(focusedEl, currentIndex);
            result.log("\tselector: %s", selector);
            resultEl = findNextRowWithSelection(nextIndex, dir, selector);
            return resultEl && resultEl.length ? resultEl : focusedEl;// if the result cannot be found. return the current one.
        }

        /**
         * ###<a name="getSelector">getSelector</a>###
         * @param {HTMLElement} el
         * @param {Number=} currentIndex
         * @returns {*}
         */
        function getSelector(el, currentIndex) {
            el = el[0] || el;
            if (el) {
                currentIndex = currentIndex || inst.getRowIndexFromElement(el);
                var rowEl = inst.getRowElm(currentIndex);
                return ux.selector.quickSelector(el, rowEl[0], filterClasses);
            }
            return '';
        }

        /**
         * ###<a name="performFocus">performFocus</a>###
         * Do the actual focus. Select the text if select exists.
         * @param {JQLite} focusEl
         */
        function performFocus(focusEl) {
            result.log("\tperformFocus %o", focusEl[0]);
            var success = false;
            // we now need to scroll the row into view if it is not.
            if (focusEl[0]) {
                inst.scrollModel.scrollIntoView(inst.getRowIndexFromElement(focusEl), true);
                if (focusEl[0].select) {
                    focusEl[0].select();
                }
                focusEl[0].focus();
                success = true;
            }
            return success;
        }

        /**
         * ###<a name="findNextRowWithSelection">findNextRowWithSelection</a>###
         * Find the next row that has a matching selection. If one is not found it will no focus.
         * Since a creep render happens after every scroll it should not have difficulty finding a row.
         * However, possible bug here if a selector similar to this one doesn't exist for a large distance.
         * @param {Number} nextIndex
         * @param {Number} dir
         * @param {String} selector
         * @returns {JQLite}
         */
        function findNextRowWithSelection(nextIndex, dir, selector) {
            result.log("\tfindNextRowWithSelection");
            if (inst.options.gridFocusManager && inst.options.gridFocusManager.filterNextPattern) {
                // make it look just through the objects to jump to that item.
                while (nextIndex > 0 && nextIndex < inst.rowsLength - 1 && !exports.util.isMatch(inst.data[nextIndex], inst.options.gridFocusManager.filterNextPattern)) {
                    nextIndex += dir;
                }
            }
            var nextEl = inst.getRowElm(nextIndex),
                focusEl;
            if (nextEl[0].classList.contains('uncompiled')) {
                // we must remove the hidden value on the uncompiled or it will not pass visibility.
                nextEl[0].classList.remove('uncompiled');
                focusEl = query(nextEl[0], selector);
                nextEl[0].classList.add('uncompiled');
            } else {
                focusEl = query(nextEl[0], selector);
            }
            var content = inst.getContent();
            while (!focusEl[0] && ((dir > 0 && nextIndex < inst.rowsLength - 1) || (dir < 0 && nextIndex > 0))) {
                nextIndex += dir;
                nextEl = inst.getRowElm(nextIndex);
                if (nextEl[0] === content) {
                    return;
                }
                focusEl = query(nextEl[0], selector);
            }
            return focusEl;
        }

        function onResize(event) {
            var index;
            if (document.activeElement !== inst.element[0] && inst.element[0].contains(document.activeElement)) {
                index = inst.getRowIndexFromElement(document.activeElement);
                inst.scrollModel.scrollIntoView(index);
            }
        }

        function throttleNextPrev(method) {
            if (inst.options.gridFocusManager && inst.options.gridFocusManager.throttleNextPrev) {
                if (throttleIntv) {
                    return;
                } else {
                    throttleIntv = setTimeout(function () {
                        clearTimeout();
                        throttleIntv = 0;
                    }, inst.options.gridFocusManager.throttleNextPrev);
                }
            }
            inst.creepRenderModel.stop();
            inst.flow.add(method, [document.activeElement], 0);
        }

        function focusToPrevElementOfSame(evt, checkFn) {
            if (inst.element[0].contains(document.activeElement)) {
                throttleNextPrev(function(activeElement) {
                    var found = false;
                    if (checkFn) {
                        focusToSiblingRowBackupPlan(activeElement, checkFn, -1);
                        found = true;
                    } else {
                        found = focusToSiblingRowBackupPlan(activeElement, checkFn, -1);
                    }
                    if (!found) {
                        inst.scope.$emit(exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME_FAILURE);
                    }
                });
            }
        }

        function focusToNextElementOfSame(evt, checkFn) {
            if (inst.element[0].contains(document.activeElement)) {
                throttleNextPrev(function(activeElement) {
                    var found = false;
                    if (checkFn) {
                        focusToSiblingRowBackupPlan(activeElement, checkFn, 1);
                        found = true;
                    } else {
                        found = focusToNextRowElement(activeElement);
                    }
                    if(!found) {
                        inst.scope.$emit(exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME_FAILURE);
                    }
                });
            }
        }

        function focusToSiblingRowBackupPlan(activeElement, checkFn, delta) {
            // if it failed. Then use the checkFn to look further if it exists.
            var toIndex = inst.getRowIndexFromElement(activeElement) + delta;
            var list = inst.getData();
            var selector = getSelector(activeElement);
            var focusToIndex;
            var i;
            var unwatch;
            function onAfterRender() {
                unwatch();
                var row = inst.getRowElm(focusToIndex);
                var fel = query(row, selector);
                if (fel) {
                    performFocus(fel);
                } else {
                    if (delta < 0) {
                        inst.scope.$emit(exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME_FAILURE);
                    } else {
                        inst.scope.$emit(exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME_FAILURE);
                    }
                }
            }
            function check(i) {
                if (checkFn(list[i])) {
                    focusToIndex = i;
                    unwatch = inst.scope.$on(exports.datagrid.events.ON_AFTER_RENDER, onAfterRender);
                    if (!inst.scrollModel.scrollIntoView(i, true)){
                        onAfterRender();
                    }
                    return true;
                }
                return false;
            }
            if (delta < 0) {
                for (i = toIndex; i >= 0; i -= 1) {
                    if (check(i)) {
                        return true;
                    }
                }
            } else {
                for (i = toIndex; i < inst.rowsLength; i += 1) {
                    if (check(i)) {
                        return true;
                    }
                }
            }
            return false;
        }

        // it has to match a pattern for each row. These are too unique.
        ux.selector.config.allowId = false;
        ux.selector.config.allowAttributes = false;
        ux.selector.config.addVisible = true;

        result.hasPrevRowFocusElement = hasPrevRowFocusElement;
        result.hasNextRowFocusElement = hasNextRowFocusElement;
        result.focusToPrevRowElement = focusToPrevRowElement;
        result.focusToNextRowElement = focusToNextRowElement;
        result.query = query;
        result.destroy = function destroy() {
            while (unwatchers.length) {
                unwatchers.pop()();
            }
            unwatchers = null;
            result = null;
        };

        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_RESET, removeListeners));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_RENDER, removeListeners));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_RENDER, addListeners));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME, focusToPrevElementOfSame));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME, focusToNextElementOfSame));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_HEIGHTS_UPDATED_RENDER, onResize));

        inst.gridFocusManager = result;

        return inst;
    }];
});