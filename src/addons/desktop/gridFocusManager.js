exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME = "ux-datagrid:focusToPrevElementOfSame";
exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME = "ux-datagrid:focusToNextElementOfSame";
/**
 * Handle focus for enterKey to move down the correct columns.
 */
angular.module('ux').factory('gridFocusManager', function () {
    return function (exp) {

        /**
         * We want to add and remove listeners only on the dom that is currently under watch.
         */

        var result = {}, unwatchers = [];

        function wrap(el) {
            if (el.length === undefined) {
                el = angular.element(el);
            }
            return el;
        }

        /**
         * Add all of the listeners to the visible rows.
         */
        function addListeners() {
            applyToListeners(addListenersToRow);
        }

        /**
         * remove all of the listeners from min to max.
         */
        function removeListeners() {// this needs executed before the activeRange changes.
            applyToListeners(removeListenersToRow);
        }

        /**
         * using the exp.activeRange.min/max apply methods to those rows.
         * @param method
         */
        function applyToListeners(method) {
            var i = exp.values.activeRange.min, row;
            while (i <= exp.values.activeRange.max) {
                row = exp.getRowElm(i);
                method(row);
                i += 1;
            }
        }

        /**
         * Get all of the focusable elements within an element
         * @param el
         * @returns {Array}
         */
        function getFocusableElements(el) {
            var focusable = [].slice.call(el[0].querySelectorAll('input,a,select'));
            return ux.filter(focusable, filterVisible);
        }

        /**
         * Filter the elements in the selection to only get those that are visible.
         * @param item
         * @returns {*}
         */
        function filterVisible(item) {
            return ux.visibility.isVisible(item);
        }

        /**
         * Move up the dom to determine the row of an element.
         * @param el
         * @returns {*}
         */
        function getRowElmFromChildElm(el) {
            // keep moving up until the parent is a chunk.
            var parent = el.parent();
            while (parent && !parent.hasClass(exp.options.chunkClass)) {
                el = parent;
                parent = el.parent();
            }
            return el;
        }

        /**
         * Similar to jquery find.
         * @param el
         * @param selector
         * @returns {element|*}
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
         * Apply filters to the selection array.
         * @param filterStr
         * @param elements
         * @returns {*}
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
         * Filter for eq.
         * @param filterStr
         * @param elements
         * @returns {Array}
         */
        function filterEq(filterStr, elements) {
            var index = filterStr.match(/\d+/)[0];
            return elements[index] ? [elements[index]] : [];
        }

        /**
         * Detect if is an ng-* class from the selectors.
         * @param cls
         * @returns {boolean}
         */
        function isNgClass(cls) {
            return !!(cls && cls.substr(0, 3) === 'ng-');
        }

        function filterClasses(cls) {
            var isToBeFiltered = cls ? false : true;
            if (!isToBeFiltered && exp.options.gridFocusManager && exp.options.gridFocusManager.filterClasses) {
                isToBeFiltered = (exp.options.gridFocusManager.filterClasses.indexOf(cls) !== -1);
            }
            if (!isToBeFiltered) {
                isToBeFiltered = isNgClass(cls);
            }
            return !isToBeFiltered;
        }

        /**
         * Apply event listeners to the row.
         * @param rowElm
         */
        function addListenersToRow(rowElm) {
            var focusable = getFocusableElements(rowElm);
            if (focusable.length) {
                focusable = angular.element(focusable);
                focusable.bind('keydown', onKeyDown);
            }
        }

        /**
         * Remove event listeners from that row.
         * @param rowElm
         */
        function removeListenersToRow(rowElm) {
            var focusable = getFocusableElements(rowElm);
            if (focusable.length) {
                focusable = angular.element(focusable);
                focusable.unbind('keydown', onKeyDown);
            }
        }

        /**
         * Handle Enter, up/down key events.
         * @param event
         */
        function onKeyDown(event) {
            var target = angular.element(event.currentTarget);
            if ((event.shiftKey && event.keyCode === 13) || event.keyCode === 38) {// SHIFT+ENTER, UP ARROW
                focusToPrevRowElement(target);
            } else if (event.keyCode === 13 || event.keyCode === 40) { // ENTER, DOWN ARROW
                focusToNextRowElement(target);
            }
        }

        /**
         * Focus to the previous row element from the current focused element.
         * @param focusedEl
         */
        function focusToPrevRowElement(focusedEl) {
            var focusEl = getPrevRowFocusElement(focusedEl, -1);
            performFocus(focusEl);
        }

        /**
         * Focus to the next row element from the current focused element.
         * @param focusedEl
         */
        function focusToNextRowElement(focusedEl) {
            var focusEl = getNextRowFocusElement(focusedEl);
            performFocus(focusEl);
        }

        function hasPrevRowFocusElement(focusedEl) {
            var el = getPrevRowFocusElement(focusedEl);
            return !!(el && el.length);
        }

        function hasNextRowFocusElement(focusedEl) {
            var el = getNextRowFocusElement(focusedEl);
            return !!(el && el.length);
        }

        function getPrevRowFocusElement(focusedEl) {
            return focusToRowElement(focusedEl, -1);
        }

        function getNextRowFocusElement(focusedEl) {
            return focusToRowElement(focusedEl, 1);
        }

        /**
         * Do the heavy lifting for focusing from one row to the next and pulling the selector.
         * Since it is the same going to previous or next it is all one method and just needs to know which direction
         * to increment.
         * @param focusedEl
         * @param dir
         */
        function focusToRowElement(focusedEl, dir) { // dir should be 1 or -1
            focusedEl = wrap(focusedEl);
            if (!exp.element[0].contains(focusedEl[0])) {
                return; // the focusedEl is not inside the datagrid.
            }
            var rowEl = getRowElmFromChildElm(focusedEl), nextIndex = exp.getRowIndexFromElement(focusedEl) + dir, selector;
            if (nextIndex < 0 || nextIndex >= exp.rowsLength) {
                return focusedEl;
            }
            selector = ux.selector.getSelector(focusedEl[0], rowEl[0], filterClasses);
            return findNextRowWithSelection(nextIndex, dir, selector);
        }

        /**
         * Do the actual focus. Select the text if select exists.
         * @param focusEl
         */
        function performFocus(focusEl) {
            if (focusEl[0].select) {// TODO: if no jquery. There may be no select.
                focusEl[0].select();
            }
            if (focusEl[0]) {
                focusEl[0].focus();
            }
        }

        /**
         * Find the next row that has a matching selection. If one is not found it will no focus.
         * Since a creep render happens after every scroll it should not have difficulty finding a row.
         * However, possible bug here if a selector similar to this one doesn't exist for a large distance.
         * @param nextIndex
         * @param dir
         * @param selector
         * @returns {element|*}
         */
        function findNextRowWithSelection(nextIndex, dir, selector) {
            var nextEl = exp.getRowElm(nextIndex), focusEl = query(nextEl[0], selector);
            var content = exp.getContent();
            while (!focusEl[0] && ((dir > 0 && nextIndex < exp.rowsLength - 1) || (dir < 0 && nextIndex > 0))) {
                nextIndex += dir;
                nextEl = exp.getRowElm(nextIndex);
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

        unwatchers.push(exp.scope.$on(exports.datagrid.events.BEFORE_UPDATE_WATCHERS, removeListeners));
        unwatchers.push(exp.scope.$on(exports.datagrid.events.AFTER_UPDATE_WATCHERS, addListeners));
        unwatchers.push(exp.scope.$on(exports.datagrid.events.FOCUS_TO_PREV_ELEMENT_OF_SAME, function () {
            focusToPrevRowElement(document.activeElement);
        }));
        unwatchers.push(exp.scope.$on(exports.datagrid.events.FOCUS_TO_NEXT_ELEMENT_OF_SAME, function () {
            focusToNextRowElement(document.activeElement);
        }));

        exp.gridFocusManager = result;

        return exp;
    };
});