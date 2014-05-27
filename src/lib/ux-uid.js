(function () {
    'use strict';
    var c = 0;
    exports.uid = function UID() {
        c += 1;
        var str = c.toString(36).toUpperCase();
        while (str.length < 6) {
            str = '0' + str;
        }
        return str;
    };
}());