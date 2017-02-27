/*!
* ux-angularjs-datagrid v.1.6.4
* (c) 2017, Obogo
* https://github.com/obogo/ux-angularjs-datagrid
* License: MIT.
*/
(function (exports, global) {
if (typeof define === "function" && define.amd) {
  define(exports);
} else if (typeof module !== "undefined" && module.exports) {
  module.exports = exports;
} else {
  global.ux = exports;
}

exports.datagrid.events.DRAG_START = "datagrid:dragStart";

exports.datagrid.events.DRAG_STOP = "datagrid:dragStop";

exports.datagrid.events.DRAG_DROP = "datagrid:dragDrop";

exports.datagrid.options.dragRows = {
    dragClass: "",
    templateId: ""
};

angular.module("ux").factory("dragRows", function() {
    //TODO: need to have option to provide template or it will clone the row instead.
    //TODO: need to make scroll when close to top or bottom. The further away from the drag origin the faster the scroll.
    return [ "inst", /**
         * @param {Datagrid} inst
         * @returns {*}
         */
    function(inst) {
        var result = exports.logWrapper("dragRows", {}, "#00CCFF", inst);
        var dragData;
        var offsetTop = 0;
        var dragPixelCushion = 4;
        var lastY = 0;
        var clone;
        var indicator;
        var rowOverlay;
        function init() {
            addListeners();
        }
        function isDragging() {
            return !!dragData;
        }
        function disableSelection(el) {
            el.style.webkitUserSelect = "none";
            el.style.khtmlUserSelect = "none";
            el.style.mozUserSelect = "-moz-none";
            el.style.mozUserSelect = "none";
            el.style.msUserSelect = "none";
            el.style.userSelect = "none";
        }
        function enableSelection(el) {
            el.style.webkitUserSelect = "";
            el.style.khtmlUserSelect = "";
            el.style.mozUserSelect = "";
            el.style.mozUserSelect = "";
            el.style.msUserSelect = "";
            el.style.userSelect = "";
        }
        function calculatePos(evt) {
            return evt.pageY - offsetTop + inst.element[0].scrollTop - dragData.height * .5;
        }
        function setIndicatorPos(y) {
            var data = findIndexFrom(y);
            indicator.style.top = data.y + "px";
            dragData.targetIndex = data.index;
        }
        function createIndicator() {
            indicator = document.createElement("div");
            indicator.style.top = "0px";
            indicator.style.left = "0px";
            indicator.style.position = "absolute";
            indicator.style.webkitTransform = "translateY(-50%);";
            indicator.style.mozTransform = "translateY(-50%);";
            indicator.style.msTransform = "translateY(-50%);";
            indicator.style.transform = "translateY(-50%);";
            indicator.classList.add("ux-datagrid-dragRow-indicator");
        }
        function createRowOverlay() {
            rowOverlay = document.createElement("div");
            rowOverlay.style.position = "absolute";
            //TODO: needs to have row same dimensions, and same position.
            rowOverlay.style.top = "0px";
            rowOverlay.style.left = "0px";
            rowOverlay.classList.add("ux-datagrid-row-overlay");
        }
        function start(evt, index) {
            offsetTop = inst.element[0].offsetTop;
            disableSelection(inst.element[0]);
            var el = inst.getRowElm(index);
            var div = document.createElement("div");
            div.innerHTML = el[0].outerHTML;
            clone = div.children[0];
            createIndicator();
            div.innerHTML = "";
            dragData = {
                index: index,
                el: el,
                data: inst.getRowItem(index),
                height: inst.getRowHeight(index),
                cloneEl: clone
            };
            clone.style.position = "absolute";
            clone.style.top = calculatePos(evt) + "px";
            clone.style.left = "0px";
            clone.classList.add("ux-datagrid-dragRow-dragging");
            inst.element.append(indicator);
            inst.element.append(clone);
            inst.dispatch(exports.datagrid.events.DRAG_START, dragData);
            inst.element.on("mousemove", onMove);
            inst.element.on("mouseup", onDrop);
        }
        function onMove(evt) {
            var y;
            if (evt.pageY > lastY + dragPixelCushion || evt.pageY < lastY - dragPixelCushion) {
                y = calculatePos(evt);
                dragData.cloneEl.style.top = calculatePos(evt) + "px";
                dragData.cloneEl.style.left = "0px";
                lastY = evt.pageY;
                setIndicatorPos(y);
            }
        }
        function stop() {
            var unwatch;
            if (dragData) {
                inst.element.off("mousemove", onMove);
                inst.element.off("mouseup", onDrop);
                inst.dispatch(exports.datagrid.events.DRAG_STOP, dragData);
                dragData = undefined;
                enableSelection(inst.element[0]);
                // listen for grid render to complete and then remove the clone.
                unwatch = inst.scope.$on(exports.datagrid.events.ON_AFTER_RENDER, function() {
                    unwatch();
                    inst.element[0].removeChild(clone);
                    inst.element[0].removeChild(indicator);
                    clone = null;
                    indicator = null;
                });
            }
        }
        function getIndexAt(evt) {
            return findIndexFrom(calculatePos(evt)).index;
        }
        function findIndexFrom(y) {
            var i = 0, //inst.getOffsetIndex(y),
            len = inst.rowsLength, totalHeight = 0, rowHeight = 0;
            for (i; i < len; i += 1) {
                rowHeight = inst.getRowHeight(i);
                totalHeight += rowHeight;
                if (totalHeight - rowHeight * .5 > y) {
                    return {
                        index: i + 1,
                        y: totalHeight
                    };
                }
            }
            return -1;
        }
        function onDrop(evt) {
            // figure out the index here. Then we can insert it by changing the row data.
            inst.dispatch(exports.datagrid.events.DRAG_DROP, dragData);
            // put the one that is farthest down in first.
            inst.moveItem(dragData.index, dragData.targetIndex);
            stop();
        }
        function addListeners() {}
        function removeListeners() {}
        function destroy() {
            removeListeners();
        }
        result.isDragging = isDragging;
        result.start = start;
        result.stop = stop;
        result.destroy = destroy;
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_READY, init));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_DATA_CHANGE, function(event) {
            stop();
        }));
        inst.dragRows = result;
        return inst;
    } ];
});
}(this.ux = this.ux || {}, function() {return this;}()));
