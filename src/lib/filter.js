function filter(list, method, data) {
    var i = 0, len, result = [];
    if (list && list.length) {
        len = list.length;
        while (i < len) {
            if (method(list[i], i, list, data)) {
                result.push(list[i]);
            }
            i += 1;
        }
    } else {
        for (i in list) {
            if (list.hasOwnProperty(i)) {
                if (method(list[i], i, list, data)) {
                    result.push(list[i]);
                }
            }
        }
    }
    return result;
}
exports.filter = filter;