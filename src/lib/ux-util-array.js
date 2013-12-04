function toArray(obj) {
    var result = [], i = 0, len = obj.length;
    while (i < len) {
        result.push(obj[i]);
        i += 1;
    }
    return result;
}

exports.util = exports.util || {};
exports.util.array = exports.util.array || {};
exports.util.array.toArray = toArray;