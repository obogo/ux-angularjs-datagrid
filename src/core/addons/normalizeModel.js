/*global ux */
exports.datagrid.coreAddons.normalizeModel = function normalizeModel(inst) {
//TODO: this needs to be put on exp.normalizedModel
    var originalData, normalizedData, result = exports.logWrapper('normalizeModel', {}, 'grey', inst.dispatch);

    /**
     * ###<a name="normalize">normalize</a>###
     * Convert a hierarchical data structure into a flattened array so that headers, rows, and however deep the data is
     * will all be able to represented by template rows.
     * @param {Array} data
     * @param {String} grouped
     * @param {Array=} normalized
     * @returns {Array}
     */
    inst.normalize = function normalize(data, grouped, normalized) {
        data = data || [];
        var i = 0, len = data.length;
        normalized = normalized || [];
        while (i < len) {
            normalized.push(data[i]);
            if (data[i] && data[i][grouped]) {
                inst.normalize(data[i][grouped], grouped, normalized);
            }
            i += 1;
        }
        return normalized;
    };

    /**
     * ###<a name="setData">setData</a>###
     * Set the data so that it can be normalized.
     * @param {Array} data
     * @param {String} grouped
     * @returns {*}
     */
    inst.setData = function (data, grouped) {
        result.log('setData');
        originalData = data;
        if (grouped) {
            normalizedData = inst.normalize(data, grouped);
        } else {
            normalizedData = data && data.slice(0) || []; // no need to normalize it is it is not grouped.
        }
        return normalizedData;
    };
    /**
     * ###<a name="getData">getData</a>###
     * Get the data the datagrid is using. This is normalized data.
     * @returns {Array}
     */
    inst.getData = function () {
        return normalizedData;
    };
    /**
     * ###<a name="getOriginalData">getOriginalData</a>###
     * Get the data that the normalized data was created from.
     * @returns {Array}
     */
    inst.getOriginalData = function () {
        return originalData;
    };
    /**
     * ##<a name="getOriginalIndexOfItem">getOriginalIndexOfItem</a>##
     * get the index or indexes of the item from the original data that the normalized array was created from.
     */
    inst.getOriginalIndexOfItem = function getOriginalIndexOfItem(item) {
        var indexes = ux.each(originalData, findItem, item, []);
        return indexes && indexes !== originalData ? indexes : [];
    };

    /**
     * ###<a name="findItem">findItem</a>###
     * find the item in the list of items and recursively search the child arrays if they have the grouped property
     * @param {*} item
     * @param {Number} index
     * @param {Array} list
     * @param {*} targetItem
     * @param {Array} indexes
     * @returns {*}
     */
    function findItem(item, index, list, targetItem, indexes) {
        var found;
        indexes = indexes.slice(0);
        indexes.push(index);
        if (item === targetItem) {
            return indexes;
        } else if (item[inst.grouped] && item[inst.grouped].length) {
            found = ux.each(item[inst.grouped], findItem, targetItem, indexes);
            if (found && found !== item[inst.grouped]) {
                return found;
            }
        }
        return undefined;
    }

    /**
     * ###<a name="getNormalizedIndex">getNormalizedIndex</a>###
     * Get the normalized index for an item.
     * @param {*} item
     * @param {Number=} startIndex
     */
    inst.getNormalizedIndex = function getNormalizedIndex(item, startIndex) {
        var i = startIndex || 0;
        while (i < inst.rowsLength) {
            if (inst.data[i] === item) {
                return i;
            }
            i += 1;
        }
        if (startIndex) {
            i = startIndex;
            while (i >= 0) {
                if (inst.data[i] === item) {
                    return i;
                }
                i -= 1;
            }
        }
        return -1;
    };

    /**
     * ###<a name="destroy">destroy</a>###
     * Make sure all variables are cleaned up.
     */
    result.destroy = function destroy() {
        result.destroyLogger();
        originalData = null;
        normalizedData = null;
        inst.normalizeModel = null;
        inst = null;
        result = null;
    };

    inst.normalizeModel = result;

    return inst;
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.normalizeModel);