/**
 * **filter** built on the same concepts as each. So that you can pass additional arguments.
 * @param list
 * @param method
 * @param data
 * @returns {Array}
 */
function filter(list, method, data) {
    var i = 0, len, result = [], extraArgs, response;
    if (arguments.length > 2) {
        extraArgs = exports.util.array.toArray(arguments);
        extraArgs.splice(0, 2);
    }
    if (list && list.length) {
        len = list.length;
        while (i < len) {
            response = method.apply(null, [list[i], i, list].concat(extraArgs));
            if (response) {
                result.push(list[i]);
            }
            i += 1;
        }
    } else {
        for (i in list) {
            if (Object.prototype.hasOwnProperty.apply(list, [i])) {
                response = method.apply(null, [list[i], i, list].concat(extraArgs));
                if (response) {
                    result.push(list[i]);
                }
            }
        }
    }
    return result;
}
exports.filter = filter;