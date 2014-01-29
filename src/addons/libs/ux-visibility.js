/*global exports */
/**
 * Author: Jason Farrell
 * Author URI: http://useallfive.com/
 *
 * Description: Handles all things involving element visibility.
 * Package URL: https://github.com/UseAllFive/ua5-js-utils
 * 
 * Modified by Wes Jones.
 */
exports.visibility = (function () {
    /**
     * Checks if a DOM element is visible. Takes into
     * consideration its parents and overflow.
     *
     * @param (el)      the DOM element to check if is visible
     */
    function _isVisible(el) {
        var p = el.parentNode,
            VISIBLE_PADDING = 2;

        if (!_elementInDocument(el)) {
            return false;
        }

        //-- Return true for document node
        if (9 === p.nodeType) {
            return true;
        }

        //-- Return false if our element is invisible
        if (
            '0' === _getStyle(el, 'opacity') ||
                'none' === _getStyle(el, 'display') ||
                'hidden' === _getStyle(el, 'visibility')
            ) {
            return false;
        }

        //-- If we have a parent, let's continue:
        if (p) {
            //-- Let's recursively check upwards:
            return _isVisible(p);
        }
        return true;
    }

    //-- Cross browser method to get style properties:
    function _getStyle(el, property) {
        if (window.getComputedStyle) {
            return document.defaultView.getComputedStyle(el, null)[property];
        }
        if (el.currentStyle) {
            return el.currentStyle[property];
        }
        return undefined;
    }

    function _elementInDocument(element) {
        while ((element = element.parentNode)) {
            if (element == document) {
                return true;
            }
        }
        return false;
    }

    return {
        'getStyle': _getStyle,
        'isVisible': _isVisible
    };

})();