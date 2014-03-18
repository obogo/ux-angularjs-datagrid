/**
 * ###<a name="extend">extend</a>###
 * Perform a deep extend.
 * @param {Object} destination
 * @param {Object=} source
 * return {Object|destination}
 */
exports.extend = function (destination, source) {
    var args = exports.util.array.toArray(arguments), i = 1, len = args.length, item, j;
    while (i < len) {
        item = args[i];
        for (j in item) {
            if (destination[j] && typeof destination[j] === 'object') {
                destination[j] = exports.extend(destination[j], item[j]);
            } else {
                destination[j] = item[j];
            }
        }
        i += 1;
    }
    return destination;
};