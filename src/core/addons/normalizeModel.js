/*global ux */
exports.datagrid.coreAddons.normalizeModel = function normalizeModel(exp) {
//TODO: this needs to be put on exp.normalizedModel
    var originalData, normalizedData, result = exports.logWrapper('normalizeModel', {}, 'grey', exp.dispatch);

    function normalize(data, grouped, normalized) {
        data = data || [];
        var i = 0, len = data.length;
        normalized = normalized || [];
        while (i < len) {
            normalized.push(data[i]);
            if (data[i] && data[i][grouped]) {
                normalize(data[i][grouped], grouped, normalized);
            }
            i += 1;
        }
        return normalized;
    }

    exp.setData = function (data, grouped) {
        result.log('setData');
        originalData = data;
        if (grouped) {
            normalizedData = normalize(data, grouped);
        } else {
            normalizedData = data ? data.slice(0) : []; // no need to normalize it is it is not grouped.
        }
        return normalizedData;
    };
    exp.getData = function () {
        return normalizedData;
    };
    exp.getOriginalData = function () {
        return originalData;
    };

    /**
     * Get the normalized index for an item.
     * @param item
     * @param {Number=} startIndex
     */
    exp.getNormalizedIndex = function getNormalizedIndex(item, startIndex) {
        var i = startIndex || 0;
        while (i < exp.rowsLength) {
            if (exp.data[i] === item) {
                return i;
            }
            i += 1;
        }
        if (startIndex) {
            i = startIndex;
            while (i >= 0) {
                if (exp.data[i] === item) {
                    return i;
                }
                i -= 1;
            }
        }
        return -1;
    };

    result.destroy = function destroy() {
        result.destroyLogger();
        result = null;
    };

    exp.normalizeModel = result;

    return exp;
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.normalizeModel);