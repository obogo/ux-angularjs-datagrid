/**
 * ##ux.each##
 * Like angular.forEach except that you can pass additional arguments to it that will be available
 * in the iteration function. It is optimized to use while loops where possible instead of for loops for speed.
 * Like Lo-Dash.
 * @param {Array\Object} list
 * @param {Function} method
 * @param {*=} data _additional arguments passes are available in the iteration function_
 * @returns {*}
 */
//_example:_
//
//      function myMethod(item, index, list, arg1, arg2, arg3) {
//          console.log(arg1, arg2, arg3);
//      }
//      ux.each(myList, myMethod, arg1, arg2, arg3);
function each(list, method, data) {
    var i = 0, len, result, extraArgs;
    if (arguments.length > 2) {
        extraArgs = exports.util.array.toArray(arguments);
        extraArgs.splice(0, 2);
    }
    if (list && list.length) {
        len = list.length;
        while (i < len) {
            result = method.apply(null, [list[i], i, list].concat(extraArgs));
            if (result !== undefined) {
                return result;
            }
            i += 1;
        }
    } else if(list && list.hasOwnProperty('0')) {
        while (list.hasOwnProperty(i)) {
            result = method.apply(null, [list[i], i, list].concat(extraArgs));
            if (result !== undefined) {
                return result;
            }
            i += 1;
        }
    } else if(!(list instanceof Array)) {
        for (i in list) {
            if (list.hasOwnProperty(i)) {
                result = method.apply(null, [list[i], i, list].concat(extraArgs));
                if (result !== undefined) {
                    return result;
                }
            }
        }
    }
    return list;
}
exports.each = each;