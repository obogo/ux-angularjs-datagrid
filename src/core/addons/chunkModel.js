/**
 * ###chunkModel###
 * Because the browser has low performance on dom elements that exist in high numbers and are all
 * siblings chunking is used to break them up into limits of their number and their parents and so on.
 * So think of it as every chunk not having more than X number of children weather those children be
 * chunks or they be rows.
 *
 * This speeds up the browser significantly because a resize event from a dom element will not affect
 * all of them, but just those direct siblings and then it's parents siblings and so on up the chain.
 *
 * @param {Datagrid} inst
 * @returns {{}}
 */
exports.datagrid.coreAddons.chunkModel = function chunkModel(inst) {

    var _list, _rows, _chunkSize, _el, result = exports.logWrapper('chunkModel', {}, 'purple', inst.dispatch),
        _templateStartCache, _templateEndCache, _cachedDomRows = [];

    /**
     * **getChunkList**
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
     * @param {Array} list
     * @param {Number} size
     * @param {String} templateStart
     * @param {String} templateEnd
     * @returns {ChunkArray}
     */
    function chunkList(list, size, templateStart, templateEnd) {
        var i = 0, len = list.length, result = new ChunkArray(inst.options.chunks.detachDom), childAry, item;
        while (i < len) {
            item = list[i];
            if (i % size === 0) {
                if (childAry) {
                    childAry.updateHeight(inst.templateModel, _rows);
                }
                childAry = new ChunkArray(inst.options.chunks.detachDom);
                childAry.min = item.min || i;
                childAry.templateModel = inst.templateModel;
                childAry.templateStart = templateStart;
                childAry.templateEnd = templateEnd;
                childAry.parent = result;
                childAry.index = result.length;
                result.push(childAry);
            }
            if (item instanceof ChunkArray) {
                item.parent = childAry;
                item.index = childAry.length;
            }
            childAry.push(item);
            childAry.max = item.max || i;
            i += 1;
        }
        if (childAry) {
            childAry.updateHeight(inst.templateModel, _rows);
        }
        if (!result.min) {
            result.min = result[0] ? result[0].min : 0;
            result.max = result[result.length - 1] ? result[result.length - 1].max : 0;
            result.templateStart = templateStart;
            result.templateEnd = templateEnd;
            result.updateHeight(inst.templateModel, _rows);
            result.dirtyHeight = false;
        }
        return result.length > size ? chunkList(result, size, templateStart, templateEnd) : result;
    }

    /**
     * ###<a name="updateAllChunkHeights">updateAllChunkHeights</a>###
     * Update rows affected by this particular index change. if rowIndex is undefined, update all.
     * @param {Number=} rowIndex
     */
    function updateAllChunkHeights(rowIndex) {
        var indexes, ary;
        if (rowIndex === undefined || inst.options.chunks.detachDom) {
            //TODO: unit test needed.
            // detach dom must enter here, because it is absolute positioned so it will not push down
            // the other chunks automatically like relative positioning will.
            if (_list) {
                _list.forceHeightReCalc(inst.templateModel, _rows);
                _list.updateHeight(inst.templateModel, _rows, 1, true);
                if (_list.detachDom) {
                    _list.updateDomHeight(1);
                }
            }
        } else {
            indexes = getRowIndexes(rowIndex, _list);
            ary = getArrayFromIndexes(indexes, _list);
            ary.updateHeight(inst.templateModel, _rows, -1, true);
        }
    }

    /**
     * ###<a name="getArrayFromIndexes">getArrayFromIndexes</a>###
     * Look up the chunkArray given an indexes array.
     * @param {Array} indexes
     * @param {ChunkArray} ary
     * @returns {*}
     */
    function getArrayFromIndexes(indexes, ary) {
        var index;
        while (indexes.length) {
            index = indexes.shift();
            if (ary[index] instanceof ChunkArray) {
                ary = ary[index];
            }
        }
        return ary;
    }

    /**
     * Create the chunkList so that it is ready for dom. Set properties needed to create the dom.
     * The dom gets created when the rows are accessed.
     * @param {Array} list // single dimensional array only.
     * @param {Number} size
     * @param {String} templateStart
     * @param {String} templateEnd
     * @param {DomElement} el
     * @returns {DomElement}
     */
    function chunkDom(list, size, templateStart, templateEnd, el) {
        result.log('chunkDom');
        _el = el;
        _chunkSize = size;
        _rows = list;
        _templateStartCache = templateStart;
        _templateEndCache = templateEnd;
        _list = chunkList(list, size, templateStart, templateEnd);
        updateDom(_list);
        _list.updateDomHeight(1);
        return el;
    }

    /**
     * For quick updates that do not require rechunking.
     * @param list
     * @returns {*}
     */
    function updateList(list) {
        if (_rows.length !== list.length) {
            return chunkDom(list, _chunkSize, _templateStartCache, _templateEndCache, _el);
        } else {
            var i = 0, len = list.length;
            while (i < len) {
                updateRow(i, list[i]);
                i += 1;
            }
        }
    }

    /**
     * Update the item using the normalized index to map to the chunkArray.
     * @param {Number} rowIndex
     * @param {Object} rowData
     */
    function updateRow(rowIndex, rowData) {
        var indexes = getRowIndexes(rowIndex, _list),
            lastIndex = indexes.pop(),
            ca = getItemByIndexes(indexes);
        if (ca && ca[lastIndex]) {
            ca[lastIndex] = rowData;
            ca.dirtyHeight = true;
        }
        _rows[rowIndex] = rowData;
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
        var indexes = getRowIndexes(rowIndex, _list),
            el = buildDomByIndexes(indexes);
        if (el && el.length && el.attr('row-id') === undefined) {
            el.attr('row-id', rowIndex);
        }
        return el;
    }

    /**
     * Get the dom row element.
     * @param rowIndex {Number}
     * @returns {*}
     */
    function getExistingRow(rowIndex) {
        var indexes = getRowIndexes(rowIndex, _list);
        return getDomRowByIndexes(indexes);
    }

    /**
     * ###<a name="getItemByIndexes">getItemByIndexes</a>###
     * Get the chunk or item given the indexes.
     * @param {Array} indexes
     * @returns {*}
     */
    function getItemByIndexes(indexes) {
        var indxs = indexes.slice(0), ca = _list;
        while (indxs.length) {
            ca = ca[indxs.shift()];
        }
        return ca;
    }

    /**
     * ###<a name="getDomRowByIndexes">getDomRowByIndexes</a>###
     * Get the dom element given the indexes array. This cannot be exposed because public api should use the
     * buildDomByIndexes that is called from getRow.
     * @param {Array} indexes
     * @param {Function} unrendered
     * @returns {*}
     */
    function getDomRowByIndexes(indexes, unrendered) {
        var i = 0, index, indxs = indexes.slice(0), ca = _list, el = _el;
        while (i < indxs.length) {
            index = indxs.shift();
            if (unrendered && (!ca.rendered || shouldRecompileDecompiledRows(ca))) {
                unrendered(el, ca);
                updateDom(ca);
            }

            if (!indxs.length) {
                checkAllCompiled(ca);
            }
            ca = ca[index];
            el = ca.rendered || angular.element(el.children()[index]);
        }
        return el;
    }

    function shouldRecompileDecompiledRows(ca) {
        var recompile = !ca.hasChildChunks() && ca.length && ca.rendered && ca.rendered.children().length !== ca.length;
        if (recompile) {
            result.info("recompile chunk %s", ca.getId());
        }
        return recompile;
    }

    /**
     * ###<a name="unrendered">unrendered</a>###
     * How to handle array chunks that have not been rendered yet. They may copy from cache or even create new
     * dom from html strings.
     * @param {JQLite} el
     * @param {ChunkArray} ca
     */
    function unrendered(el, ca) {
        var children, i = 0, iLen;
        el.html(ca.getChildrenStr());
        children = el.children();
        ca.rendered = el;
        if (ca.hasChildChunks()) {// assign the dom element.
            iLen = children.length;
            while (i < iLen) {
                ca[i].dom = children[i];
                i += 1;
            }
        }
        if (ca.detachDom && ca.dirtyHeight) {
            ca.updateDomHeight();
        }
        exports.each(children, computeStyles);
        if (ca.hasChildChunks()) {
            if (children[0].className.indexOf(inst.options.chunks.chunkClass) !== -1) {
                // need to calculate css styles before adding this class to make transitions work.
                children.addClass(inst.options.chunks.chunkReadyClass);
            }
        } else if (!ca.rendered.hasClass(inst.options.chunks.chunkReadyClass)) {
            ca.rendered.addClass(inst.options.chunks.chunkReadyClass);
        }
    }

    /**
     * Get the domElement by indexes, create the dom if it doesn't exist.
     * @param {Array} indexes - an array of int values.
     * @returns {*}
     */
    function buildDomByIndexes(indexes) {
        return getDomRowByIndexes(indexes, unrendered);
    }

    /**
     * ##<a name="computedStyles">computedStyles</a>##
     * calculate the computed styles of each element
     */
    function computeStyles(elm) {
        if (elm) {
            var style = window.getComputedStyle(elm);
            if (style) {
                return style.getPropertyValue('top');
            }
        }
    }

    /**
     * ##<a name="checkAllCompiled">checkAllCompiled</a>##
     * Each ChunkArray keeps track of weather or not it's dom has been compiled. Since each
     * ChunkArray generates the values and updates properties of the dom. The dom chunks are a
     * reflection of the ChunkArrays.
     * @param {ChunkArray} ca
     * @returns {Boolean}
     */
    function checkAllCompiled(ca) {
        if (!ca.compiled) {
            ca.compiled = isCompiled(ca);
            if (ca.compiled) {
                if (ca.parent) {
                    // a parent cannot be compiled till it's last child is done. So don't check until
                    // a chunk child compiles.
                    checkAllCompiled(ca.parent);
                }
                inst.flow.add(disableNonVisibleChunks);
            }
        }
        return ca.compiled;
    }

    /**
     * ##<a name="isCompiled">isCompiled</a>##
     * Validate that the chunk is compiled.
     * @param {ChunkArray} ca
     * @returns {boolean}
     */
    function isCompiled(ca) {
        var min, max;
        if (ca[0] instanceof ChunkArray) {
            min = 0;
            max = ca.length;
            while (min < max) {
                if (!ca[min].compiled) {
                    return false;
                }
                min += 1;
            }
            return true;
        }
        min = ca.min;
        max = ca.max;
        while (min < max) {
            if (!inst.isCompiled(min)) {
                return false;
            }
            min += 1;
        }
        return true;
    }

    function updateDom(ca) {
        ca.updateDom(inst.options.chunks.chunkDisabledClass);
    }

    /**
     * ###<a name="reset">reset</a>###
     * Remove all dom, and all other references.
     * @param {Array=} newList
     * @param {JQLite=} content
     * @param {Array=} scopes
     */
    function reset(newList, content, scopes) {
        result.log("reset");
        _cachedDomRows.length = 0;
        newList = newList || [];
        //TODO: this needs to make sure it destroys things properly
        if (_list) {
            _list.destroy();
            _list = null;
            _el = null;
            _rows = null;
        }
        chunkDom(newList, _chunkSize, _templateStartCache, _templateEndCache, content);
    }

    /**
     * ##<a name="disableNonVislbieChunks">disableNonVisibleChunks</a>##
     * disable all chunks that are outside of the values.activeRange.min/max.
     */
    function disableNonVisibleChunks() {
        var r = inst.values.activeRange, o = inst.options.chunks;
        _list.enableRange(r.min, r.max, o.chunkDisabledClass);
        if (o.detachDom) {
            // we need to update which chunks are compiled.
            updateDom(_list);
        }
    }

    /**
     * ###<a name="destroy">destroy</a>###
     * Clean up the chunking and recycling.
     */
    function destroy() {
        reset();
        _list = null;
        _rows = null;
        _chunkSize = null;
        _el = null;
        _templateStartCache = null;
        _templateEndCache = null;
        _cachedDomRows.length = 0;
        _cachedDomRows = null;
        inst.chunkModel = null;
        result.destroyLogger();
        result = null;
        inst = null;
    }

    inst.flow.unique(updateDom);
    result.chunkDom = chunkDom;
    result.getChunkList = getChunkList;
    result.getRowIndexes = function (rowIndex) {
        return getRowIndexes(rowIndex, _list);
    };
    result.getItemByIndexes = getItemByIndexes;
    result.getRow = getRow;
    result.getExistingRow = getExistingRow;
    result.reset = reset;
    result.updateRow = updateRow;
    result.updateList = updateList;
    result.updateAllChunkHeights = updateAllChunkHeights;
    result.destroy = destroy;

    inst.scope.$on(exports.datagrid.events.ON_AFTER_UPDATE_WATCHERS, disableNonVisibleChunks);

    // apply event dispatching.
    dispatcher(result);

    inst.chunkModel = result;
    return result;
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.chunkModel);

/**
 * ####ChunkArray####
 * is an array with additional properties needed by the chunkModel to generate and access chunks
 * of the dom with high performance.
 * @constructor
 */
function ChunkArray (detachDom) {
    this.uid = ChunkArray.uid++;
    this.enabled = true;
    this.min = 0;
    this.max = 0;
    this.templateStart = '';
    this.templateStartWithPos = '';
    this.templateEnd = '';
    this.parent = null;
    this.mode = detachDom ? ChunkArray.DETACHED : ChunkArray.ATTACHED;
    this.detachDom = detachDom;
    this.index = 0;
}
ChunkArray.uid = 0;
ChunkArray.DETACHED = 'chunkArray:detached';
ChunkArray.ATTACHED = 'chunkArray:attached';
ChunkArray.prototype = [];
ChunkArray.prototype.getStub = function getStub(str) {
    if (!this.templateStartWithPos) {
        this.createDomTemplates();
    }
    return this.templateStartWithPos + str + this.templateEnd;
};
ChunkArray.prototype.inRange = function (value) {
    return value >= this.min && value <= this.max;
};
ChunkArray.prototype.rangeOverlap = function (min, max, cushion) {
    var overlap = false;
    cushion = cushion > 0 ? cushion : 0;
    min -= cushion;
    max += cushion;
    while (min <= max) {// if min < max then a grid with only 1 items shows that row disabled.
        if (this.inRange(min)) {
            overlap = true;
            break;
        }
        min += 1;
    }
    return overlap;
};
ChunkArray.prototype.each = function (method, args) {
    var i = 0, len = this.length;
    while (i < len) {
        method.apply(this[i], args);
        i += 1;
    }
};
/**
 * #####ChunkArray.prototype.getChildStr#####
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
    return str;
};
/**
 * #####<a name="updateHeight">updateHeight</a>#####
 * Recalculate the height of this chunk.
 * @param templateModel
 * @param _rows
 */
ChunkArray.prototype.updateHeight = function (templateModel, _rows, recurse, updateDomHeight) {
    var i = 0, len, height = 0, lastChild;
    if (this[0] instanceof ChunkArray) {
        len = this.length;
        while (i < len) {
            if (recurse === 1) {
                this[i].updateHeight(templateModel, _rows, recurse, updateDomHeight);
            }
            height += this[i].height;
            i += 1;
        }
    } else {
        height = templateModel.getHeight(_rows, this.min, this.max);
    }
    if (this.height !== height) {
        this.dirtyHeight = true;
        this.height = height;
    } else if (this.rendered) {
        // comment in when debugging heights.
//        lastChild = this.rendered[0].children[this.rendered[0].children.length - 1];
//        if (lastChild.offsetTop + lastChild.offsetHeight !== this.rendered[0].offsetHeight) {
//            console.warn("Invalid Heights.");
//        }
    }
    if (recurse == -1 && this.dirtyHeight && this.parent) {
        this.parent.updateHeight(templateModel, _rows, recurse, updateDomHeight);
    }
    if (updateDomHeight && this.dirtyHeight) {
        this.updateDomHeight();
    }
};
ChunkArray.prototype.getPreviousSibling = function () {
    var prevSibling, prevIndex;
    if (this.parent) {
        prevIndex = this.index - 1;
        prevSibling = this.parent[prevIndex];
        if (!prevSibling || prevSibling.index !== this.index - 1) {
            // we must the first in the array. so we have to jump up higher. Or we are the first item in the first chunk.
            if (this.parent.parent) {
                prevSibling = this.parent.getPreviousSibling();
                if (prevSibling) {
                    prevSibling = prevSibling.last();
                }
            }
        }
    }
    return prevSibling;
};
ChunkArray.prototype.getNextSibling = function () {
    var nextSibling, nextIndex;
    if (this.parent) {
        nextIndex = this.index + 1;
        nextSibling = this.parent[nextIndex];
        if (!nextSibling || nextSibling.index !== this.index + 1) {
            // we must be at the end of the array. So we need to jump up higher. Or we could be at the very end.
            if (this.parent.parent) {
                nextSibling = this.parent.getNextSibling();
                if (nextSibling) {
                    nextSibling = nextSibling.first();
                }
            }
        }
    }
    return nextSibling;
};
ChunkArray.prototype.first = function () {
    return this[0];
};
ChunkArray.prototype.last = function () {
    return this[this.length - 1];
};
/**
 * #####<a name="calculateTop">calculateTop</a>#####
 * Calculate the top value relative to it's parent.
 * @returns {number|top}
 */
ChunkArray.prototype.calculateTop = function () {
    var top = 0, prevSibling;
    if (this.index && this.parent) {
        prevSibling = this.getPreviousSibling();
        if (prevSibling) {
            top = prevSibling.top + prevSibling.height;
        }
    }
    this.top = top;
    return this.top;
};
/**
 * #####<a name="forceHeightReCalc">forceHeightReCal</a>#####
 * Ignore any cached values and update the height of this chunk.
 * @param templateModel
 * @param _rows
 * @returns {number|*|height}
 */
ChunkArray.prototype.forceHeightReCalc = function (templateModel, _rows) {
    var i = 0, len, height = 0;
        if (this[0] instanceof ChunkArray) {
        len = this.length;
        while (i < len) {
            height += this[i].forceHeightReCalc(templateModel, _rows);
            i += 1;
        }
    } else {
        height = templateModel.getHeight(_rows, this.min, this.max);
    }
    if (this.height !== height) {
        this.height = height;
        if (this.detachDom) {// we need to update all siblings if we change.
            this.dirtySiblings();
        } else {
            this.setDirtyHeight();
        }
    }
    return this.height;
};
/**
 * #####<a name="setDirtyHeight">setDirtyHeight</a>#####
 * Set this chunk as dirty so heights need calculated.
 */
ChunkArray.prototype.setDirtyHeight = function () {
    var p = this;
    while (p) {
        p.dirtyHeight = true;
        p = p.parent;
    }
};
ChunkArray.prototype.dirtySiblings = function () {
    this.dirtyHeight = true;
    if (this.parent) {
        var i = 0, iLen = this.length;
        while (i < iLen) {
            this[i].dirtyHeight = true;
            i += 1;
        }
        this.parent.dirtySiblings();
    }
};
/**
 * #####<a name="getId">getId</a>#####
 * @returns {string|*|_id}
 */
ChunkArray.prototype.getId = function () {
    if (this._index !== this.index || !this._id) {
        var p = this, s = '';
        this._index = this.index;// keep the last index so if it changes. We change the id.
        while (p) {
            s = '.' + p.index + s;
            p = p.parent;
        }
        this._id = s.substr(1, s.length);
    }
    return this._id;
};
ChunkArray.prototype.hasChildChunks = function () {
    if (!this._hasChildChunks) {
        this._hasChildChunks = this.first() instanceof ChunkArray;
    }
    return this._hasChildChunks;
};
ChunkArray.prototype.enableRange = function (min, max, disabledClass) {
    if (this.rangeOverlap(min, max, this.detachDom)) {
        this.enable(disabledClass);
    } else {
        this.disable(disabledClass);
    }

    if (this.hasChildChunks()) {
        this.each(this.enableRange, [min, max, disabledClass]);
    }
};
ChunkArray.prototype.enable = function (disabledClass) {
    if (!this.enabled) {
        this.enabled = true;
        this.updateDom(disabledClass);
        if (this.parent) {
            this.parent.enable(disabledClass);
        }
    }
};
ChunkArray.prototype.disable = function (disabledClass) {
    var i = 0, len;
    if (this.compiled) {
        if (this.hasChildChunks()) {
            len = this.length;
            while (i < len) {
                this[i].disable(disabledClass);
                i += 1;
            }
        }
        if (this.enabled) {
            this.enabled = false;
            this.updateDom(disabledClass);
        }
    }
};
ChunkArray.prototype.updateDom = function (disabledClass) {
    if (this.rendered) {
        if (this.compiled && !this.rendered.attr('compiled')) {
            this.rendered.attr('compiled', true);
        }
        if (this.detachDom) {
            if (this.enabled) {
                if(this.detached) {
                    this.detached = false;
                    this.parent.rendered.append(this.rendered);
                }
            } else if (!this.enabled && !this.detached) {
                if (this.parent && this.parent.compiled && this.rendered.parent().length) {
                    this.detached = true;
                    //jquery detach is just 2nd param pass true to keep data around.
                    this.rendered.remove(undefined, true);
                }
            }
        } else {
            this.rendered.attr('enabled', this.enabled);
            if (this.enabled) {
                this.rendered.removeAttr('disabled');
                this.rendered.removeAttr('read-only');
                this.rendered.removeClass(disabledClass);
            } else {
                this.rendered.attr('disabled', 'disabled');
                this.rendered.attr('read-only', true);
                this.rendered.addClass(disabledClass);
            }
        }
        this.each(this.updateDom, [disabledClass]);
    }
};
ChunkArray.prototype.updateDomHeight = function (recursiveDirection) {
    var dom = this.rendered && this.rendered[0] || this.dom;
    if (dom) {
        this.dirtyHeight = false;
        if (this.mode === ChunkArray.DETACHED) {
            this.calculateTop();
            dom.style.top = this.top + 'px';
        }
        dom.style.height = this.height + "px";
    } else {
        this.createDomTemplates();
    }
    if (recursiveDirection === -1 && this.parent) {
        this.parent.updateDomHeight(recursiveDirection);
    } else if (recursiveDirection && this.hasChildChunks()) {
        this.each(this.updateDomHeight, [recursiveDirection]);
    }
};
ChunkArray.prototype.createDomTemplates = function() {
    if (!this.templateReady && this.templateStart) {
        var str = this.templateStart.substr(0, this.templateStart.length - 1) + ' style="';
        if (this.mode === ChunkArray.DETACHED) {
            this.calculateTop();
            str += 'position:absolute;top:' + this.top + 'px;left:0px;';
        }
        this.templateStartWithPos = str + 'width:100%;height:' + this.height + 'px;" chunk-id="' + this.getId() + '" range="' + this.min + ':' + this.max + '">';
        this.templateReady = true;
    }
};
/**
 * Return an array of the children created from the rendered properties of the children.
 */
ChunkArray.prototype.children = function () {
    var children = [];
    this.each(function () {
        children.push(this.rendered);
    }, []);
};
ChunkArray.prototype.decompile = function (chunkReadyClass) {
    if (this.hasChildChunks()) {
        this.each('decompile', [chunkReadyClass]);
    } else {
        // we are going to remove all dom rows to free up memory.
        // this can only be done if the chunk has no rows for children instead of chunks.
        if (this.rendered) {
            this.rendered.children().remove();
            this.rendered.removeClass(chunkReadyClass);
//            this.rendered = null;
        }
    }
};
/**
 * #####<a name="destroy">destroy</a>#####
 * Perform proper cleanup.
 */
ChunkArray.prototype.destroy = function () {
    if (this.hasChildChunks()) {
        this.each(this.destroy);
    }
    this.templateStart = '';
    this.templateEnd = '';
    this.templateModel = null;
    this.rendered = null;
    this.dom = null;
    this.parent = null;
    while (this.length) {
        this.pop();
    }
    this.length = 0;// in debugger items were still in there by just setting length to 0
};