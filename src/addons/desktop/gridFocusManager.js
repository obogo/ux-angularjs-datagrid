exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME = "ux-datagrid:focusToPrevElementOfSame";
exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME = "ux-datagrid:focusToNextElementOfSame";
/**
 * ##<a name="gridFocusManager">gridFocusManager</a>##
 * Handle focus for enterKey to move down the correct columns.
 * > _**Note:** One of the most common mistakes when implementing this is to have classes that are applied on focus.
 * > Those get picked up in the selectors and then when it tries to find them in the next row they do not
 * > match because they are not focused or selected yet. You can easily get around this by applying [filterClasses](#filterClasses).
 * > [filterClasses](#filterClasses) are defined in the options of the datagrid._
 * > `data-options="{gridFocusManger: {filterClasses: ['focused','selected']}}"`
 *
 */
angular.module('ux').factory('gridFocusManager', function () {
    return function (inst) {

        /**
         * We want to add and remove listeners only on the dom that is currently under watch.
         */

        var result = exports.logWrapper('gridFocusManager', {}, 'redOrange', inst.dispatch),
            unwatchers = [], keys = {ENTER: 13, UP: 38, DOWN: 40};

        /**
         * ###<a name="wrap">wrap</a>###
         * if an element is not a JQLite element then make it one.
         * @param {JQLite|DOMElement} el
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
            if (!inst.values.activeRange.max || inst.values.activeRange.max < 0) {
                return;// if max is 0. there is no point.
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
            var focusable = [].slice.call(el[0].querySelectorAll('input,a,select'));
            result.log("\tgetFocusableElements %s", focusable.length);
            return ux.filter(focusable, filterVisible);
        }

        /**
         * ###<a name="filterVisible">filterVisible</a>###
         * Filter the elements in the selection to only get those that are visible.
         * @param {DOMElement} el
         * @returns {*}
         */
        function filterVisible(el) {
            result.log("\t\tisVisible %s", ux.visibility.isVisible(el));
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
         * @param {JQLite|DOMElement} el
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
         * @param {JQLite|DOMElement} rowElm
         */
        function addListenersToRow(rowElm) {
            var focusable = getFocusableElements(rowElm);
            if (focusable.length) {
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
         * @param {JQLite|DOMElement} rowElm
         */
        function removeListenersToRow(rowElm) {
            var focusable = getFocusableElements(rowElm);
            if (focusable.length) {
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
            var target = angular.element(event.currentTarget);
            result.log('FM: onKeyDown');
            if ((event.shiftKey && event.keyCode === keys.ENTER) || event.keyCode === keys.UP) {
                focusToPrevRowElement(target);
            } else if (event.keyCode === keys.ENTER || event.keyCode === keys.DOWN) {
                focusToNextRowElement(target);
            }
        }

        /**
         * ###<a name="focusToPrevRowElement">focusToPrevRowElement</a>###
         * Focus to the previous row element from the current focused element.
         * @param {JQLite} focusedEl
         */
        function focusToPrevRowElement(focusedEl) {
            var focusEl = getPrevRowFocusElement(focusedEl, -1);
            performFocus(focusEl);
        }

        /**
         * ###<a name="focusToNextRowElement">focusToNextRowElement</a>###
         * Focus to the next row element from the current focused element.
         * @param {JQLite} focusedEl
         */
        function focusToNextRowElement(focusedEl) {
            result.log("\tFM: focusToNextRowElement");
            var focusEl = getNextRowFocusElement(focusedEl);
            performFocus(focusEl);
        }

        /**
         * ###<a name="hasPrevRowFocusElement">hasPrevRowFocusElement</a>###
         * check to see if the previous row has the same selector which is derived from the focusedEl
         * @param {DOMElement} focusedEl
         * @returns {boolean}
         */
        function hasPrevRowFocusElement(focusedEl) {
            var el = getPrevRowFocusElement(focusedEl);
            return !!(el && el.length && el[0] !== focusedEl);
        }

        /**
         * ###<a name="hasNextRowFocusElement">hasNextRowFocusElement</a>###
         * check to see if the next row has the same selector which is derived from the focusedEl
         * @param {DOMElement} focusedEl
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
                rowEl = getRowElmFromChildElm(focusedEl),
                currentIndex = inst.getRowIndexFromElement(focusedEl),
                nextIndex = currentIndex + dir, selector;
            if (nextIndex < 0 || nextIndex >= inst.rowsLength) {
                return focusedEl;
            }
            selector = ux.selector.getSelector(focusedEl[0], rowEl[0], filterClasses);
            result.log("\tselector: %s", selector);
            resultEl = findNextRowWithSelection(nextIndex, dir, selector);
            return resultEl && resultEl.length ? resultEl : focusedEl;// if the result cannot be found. return the current one.
        }

        /**
         * ###<a name="performFocus">performFocus</a>###
         * Do the actual focus. Select the text if select exists.
         * @param {JQLite} focusEl
         */
        function performFocus(focusEl) {
            result.log("\tperformFocus %o", focusEl[0]);
            if (focusEl[0].select) {// TODO: if no jquery. There may be no select.
                focusEl[0].select();
            }
            if (focusEl[0]) {
                focusEl[0].focus();
            }
            // we now need to scroll the row into view if it is not.
            inst.scrollModel.scrollIntoView(inst.getRowIndexFromElement(focusEl), true);
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
            var nextEl = inst.getRowElm(nextIndex), focusEl = query(nextEl[0], selector);
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
        unwatchers.push(inst.scope.$on(exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME, function () {
            if (inst.element[0].contains(document.activeElement)) {
                focusToPrevRowElement(document.activeElement);
            }
        }));
        unwatchers.push(inst.scope.$on(exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME, function () {
            if (inst.element[0].contains(document.activeElement)) {
                focusToNextRowElement(document.activeElement);
            }
        }));

        inst.gridFocusManager = result;

        return inst;
    };
});