/*global ux */
// we want to override the default scrolling if it is an IOS device.

angular.module('ux').factory('iosScrollFriction', function () {
    return function iosScrollFriction(exp) {
        var result = {
            destroy: function () {
                exp = null;
                result = null;
            }
        };
        if (navigator.userAgent.match(/(iPad|iPhone|iPod)/g)) {
            // this is required to make IOS scroll smoothly.
            exp.element.css({webkitOverflowScrolling: "touch"});
        }
        exp.iosScrollFriction = result;
        return exp;
    };
});