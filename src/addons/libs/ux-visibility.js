/*global exports */
/**
 * ##<a name="visibility">ux.visibility</a>##
 * Determines simplistic element visibility.
 */
exports.visibility = (function () {
    /**
     * ###<a name="isVisible">isVisible</a>###
     * Checks if a DOM element is visible. Takes into consideration its parents.
     * @param {DOMElement} el the DOMElement to check if is visible
     * @param {maxParent} when max parent is reached it will stop.
     * @param {allowOpacity=} if true then opacity will not return a false if it is 0.
     */
    function isVisible(el, maxParent, allowOpacity) {
        var p = el.parentNode;

        if (!elementInDocument(el)) {
            return false;
        }

        if (9 === p.nodeType) {// Return true for document node
            return true;
        }

        // Return false if our element is invisible
        if (!allowOpacity && getStyle(el, 'opacity') === '0') {
            return false;
        }
        if ('none' === getStyle(el, 'display') || 'hidden' === getStyle(el, 'visibility')) {
            return false;
        }

        if (p && p !== maxParent) {//-- If we have a parent, let's continue:
            //-- Let's recursively check upwards:
            return isVisible(p, maxParent, allowOpacity);
        }
        return true;
    }

    /**
     * ###<a name="getStyle">getStyle</a>###
     * Cross browser method to get style properties.
     * @param {DOMElement} el
     * @param {String} property
     * @returns {*}
     */
    function getStyle(el, property) {
        if (window.getComputedStyle) {
            return document.defaultView.getComputedStyle(el, null)[property];
        }
        if (el.currentStyle) {
            return el.currentStyle[property];
        }
        return undefined;
    }

    /**
     * ###<a name="elementInDocument">elementInDocument</a>###
     * @param {DOMElement} element
     * @returns {boolean}
     */
    function elementInDocument(element) {
        while ((element = element.parentNode)) {
            if (element == document) {
                return true;
            }
        }
        return false;
    }

    return {
        'getStyle': getStyle,
        'isVisible': isVisible
    };

})();