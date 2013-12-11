/*global ux */
exports.datagrid.coreAddons.normalizeModel = function normalizeModel(exp) {
//TODO: this needs to be put on exp.normalizedModel
    var originalData, normalizedData;

    function normalize(data, grouped, normalized) {
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
        originalData = data;
        if (grouped) {
            normalizedData = normalize(data, grouped);
        } else {
            normalizedData = data; // no need to normalize it is it is not grouped.
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
     */
    exp.getNormalizedIndex = function getNormalizedIndex(item) {
        return exp.data.indexOf(item);
    };

    return exp;
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.normalizeModel);