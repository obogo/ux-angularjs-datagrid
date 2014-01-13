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
    } else {
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