function each(list, method, data) {
    var i = 0, len, result;
    if (list && list.length) {
        len = list.length;
        while (i < len) {
            result = method(list[i], i, list, data);
            if (result !== undefined) {
                return result;
            }
            i += 1;
        }
    } else {
        for (i in list) {
            if (list.hasOwnProperty(i)) {
                result = method(list[i], i, list, data);
                if (result !== undefined) {
                    return result;
                }
            }
        }
    }
    return list;
}
exports.each = each;