/**
 * Handle focus for enterKey to move down the correct columns.
 */
angular.module('ux').factory('gridFocusManager', function () {
    return function (exp) {

        /**
         * We want to add and remove listeners only on the dom that is currently under watch.
         */

        var result = {}, unwatchers = [];

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
            }
            return params;
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
         * Filter out all ng-* classes from the selectors.
         * @param cls
         * @returns {boolean}
         */
        function filterNg(cls) {
            return !!(cls && cls.substr(0, 3) !== 'ng-');
        }

        /**
         * Apply event listeners to the row.
         * @param rowElm
         */
        function addListenersToRow(rowElm) {
            var focusable = getFocusableElements(rowElm);
            if (focusable.length) {
                focusable = angular.element(focusable);
                focusable.on('keydown', onKeyDown);
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
                focusable.off('keydown', onKeyDown);
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
            focusToRowElement(focusedEl, -1);
        }

        /**
         * Focus to the next row element from the current focused element.
         * @param focusedEl
         */
        function focusToNextRowElement(focusedEl) {
            focusToRowElement(focusedEl, 1);
        }

        /**
         * Do the heavy lifting for focusing from one row to the next and pulling the selector.
         * Since it is the same going to previous or next it is all one method and just needs to know which direction
         * to increment.
         * @param focusedEl
         * @param dir
         */
        function focusToRowElement(focusedEl, dir) { // dir should be 1 or -1
            var rowEl = getRowElmFromChildElm(focusedEl), nextIndex = rowEl.scope().$index + dir, selector, focusEl;
            if (nextIndex < 0 || nextIndex >= exp.rowsLength) {
                return;
            }
            selector = ux.selector.getSelector(focusedEl[0], rowEl[0], filterNg);
            focusEl = findNextRowWithSelection(nextIndex, dir, selector);
            if (focusEl.select) {// TODO: if no jquery. There may be no select.
                focusEl.select();
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

        result.query = query;
        result.destroy = function destroy() {
            while (unwatchers.length) {
                unwatchers.pop()();
            }
            unwatchers = null;
            result = null;
        };

        unwatchers.push(exp.scope.$on(ux.datagrid.events.BEFORE_UPDATE_WATCHERS, removeListeners));
        unwatchers.push(exp.scope.$on(ux.datagrid.events.AFTER_UPDATE_WATCHERS, addListeners));

        exp.gridFocusManager = result;

        return exp;
    };
});