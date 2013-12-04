/*global ux */
ux.listView.coreAddons.push(function normalizeModel(exports) {

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

    exports.setData = function (data, grouped) {
        originalData = data;
        if (grouped) {
            normalizedData = normalize(data, grouped);
        } else {
            normalizedData = data; // no need to normalize it is it is not grouped.
        }
        return normalizedData;
    };
    exports.getData = function () {
        return normalizedData;
    };
    exports.getOriginalData = function () {
        return originalData;
    };

    return exports;
});