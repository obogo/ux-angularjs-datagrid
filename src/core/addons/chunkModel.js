/**
 * ChunkArray is an array with additional properties needed by the chunkModel to generate and access chunks
 * of the dom with high performance.
 * @constructor
 */
var ChunkArray = function () {
};
ChunkArray.prototype = Array.prototype;
ChunkArray.prototype.min = 0;
ChunkArray.prototype.max = 0;
ChunkArray.prototype.templateStart = '';
ChunkArray.prototype.templateEnd = '';
ChunkArray.prototype.getStub = function getStub(str) {
    return this.templateStart + str + this.templateEnd;
};
/**
 * Get the HTML string representation of the children in this array.
 * If deep then return this and all children down.
 * @param deep
 * @returns {string}
 */
ChunkArray.prototype.getChildrenStr = function (deep) {
    var i = 0, len = this.length, str = '', ca = this;
    while (i < len) {
        if (ca[i] instanceof ChunkArray) {
            str += ca[i].getStub(deep ? ca[i].getChildrenStr(deep) : '');
        } else {
            str += this.templateModel.getTemplate(ca[i]).template;
        }
        i += 1;
    }
    this.rendered = true;
    return str;
};

/**
 * chunkModel
 * Because the browser has low performance on dom elements that exist in high numbers and are all
 * siblings chunking is used to break them up into limits of their number and their parents and so on.
 * So think of it as every chunk not having more than X number of children weather those children be
 * chunks or they be rows.
 *
 * This speeds up the browser significantly because a resize event from a dom element will not affect
 * all of them, but just those direct siblings and then it's parents siblings and so on up the chain.
 *
 * @param exp
 * @returns {{}}
 */
exports.datagrid.coreAddons.chunkModel = function chunkModel(exp) {

    var _list, _rows, _chunkSize, _el, result = {};

    /**
     * Return the list that was created.
     * @returns {ChunkArray}
     */
    function getChunkList() {
        return _list;
    }

    /**
     * Create a ChunkArray from the array of data that is passed.
     * The array that is passed should not be multi-dimensional. This will only work with a single
     * dimensional array.
     * @param list {Array}
     * @param size {Number}
     * @param templateStart {String}
     * @param templateEnd {String}
     * @returns {ChunkArray}
     */
    function chunkList(list, size, templateStart, templateEnd) {
        var i = 0, len = list.length, result = new ChunkArray(), childAry, item;
        while (i < len) {
            item = list[i];
            if (i % size === 0) {
                if (childAry) {
                    calculateHeight(childAry);
                }
                childAry = new ChunkArray();
                childAry.min = item.min || i;
                childAry.templateModel = exp.templateModel;
                childAry.templateStart = templateStart;
                childAry.templateEnd = templateEnd;
                result.push(childAry);
            }
            childAry.push(item);
            childAry.max = item.max || i;
            i += 1;
        }
        if (childAry) calculateHeight(childAry);
        if (!result.min) {
            result.min = result[0] ? result[0].min : 0;
            result.max = result[result.length - 1] ? result[result.length - 1].max : 0;
            result.templateStart = templateStart;
            result.templateEnd = templateEnd;
            calculateHeight(result);
        }
        return result.length > size ? chunkList(result, size, templateStart, templateEnd) : result;
    }

    /**
     * Using a ChunkArray calculate the heights of each array recursively.
     * @param ary {ChunkArray}
     */
    function calculateHeight(ary) {
        if (ary[0] instanceof ChunkArray) {
            var i = 0, len = ary.length, height = 0;
            while (i < len) {
                height += ary[i].height;
                i += 1;
            }
            ary.height = height;
        } else {
            ary.height = exp.templateModel.getHeight(_rows, ary.min, ary.max);
        }
        ary.templateStart = ary.templateStart.substr(0, ary.templateStart.length - 1) + ' style="width:100%;height:' + ary.height + 'px;">';
    }

    /**
     * Create the chunkList so that it is ready for dom. Set properties needed to create the dom.
     * The dom gets created when the rows are accessed.
     * @param list {Array} // single dimensional array only.
     * @param size {Number}
     * @param templateStart {String}
     * @param templateEnd {String}
     * @param el {DomElement}
     * @returns {DomElement}
     */
    function chunkDom(list, size, templateStart, templateEnd, el) {
        _el = el;
        _chunkSize = size;
        _rows = list;
        _list = chunkList(list, size, templateStart, templateEnd);
        return el;
    }

    /**
     * Generate an array of indexes that point to that row.
     * @param rowIndex
     * @param chunkList
     * @param indexes
     * @returns {Array}
     */
    function getRowIndexes(rowIndex, chunkList, indexes) {
        var i = 0, len = chunkList.length, chunk;
        indexes = indexes || [];
        while (i < len) {
            chunk = chunkList[i];
            if (chunk instanceof ChunkArray) {
                if (rowIndex >= chunk.min && rowIndex <= chunk.max) {
                    indexes.push(i);
                    getRowIndexes(rowIndex, chunk, indexes);
                    break;
                }
            } else { // we are at the end. So we just need the last index.
                indexes.push(rowIndex % _chunkSize);
                break;
            }
            i += 1;
        }
        return indexes;
    }

    /**
     * Get the dom row element.
     * @param rowIndex {Number}
     * @returns {*}
     */
    function getRow(rowIndex) {
        var indexes = getRowIndexes(rowIndex, _list);
        return buildDomByIndexes(indexes);
    }

    /**
     * Get the domElement by indexes, create the dom if it doesn't exist.
     * @param indexes {Number}
     * @returns {*}
     */
    function buildDomByIndexes(indexes) {
        var i = 0, index, indxs = indexes.slice(0), ca = _list, el = _el;
        while (i < indxs.length) {
            index = indxs.shift();
            if (!ca.rendered) { //!el.childElementCount) {
                el.innerHTML = ca.getChildrenStr();
            }
            ca = ca[index];
            el = el.childNodes[index];
        }
        return el;
    }

    /**
     * Remove all dom, and all other references.
     */
    function reset() {
        //TODO: this needs to make sure it destroys things properly
        if (_el) _el.innerHTML = '';
        _list = null;
        _chunkSize = null;
        _el = null;
    }

    result.chunkDom = chunkDom;
    result.getChunkList = getChunkList;
    result.getRowIndexes = function (rowIndex) {
        return getRowIndexes(rowIndex, _list);
    };
    result.getRow = getRow;
    result.reset = reset;

    // apply event dispatching.
    dispatcher(result);

    exp.chunkModel = result;
    return result;
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.chunkModel);