/**
 * Angular directive for resizing columns. It is designed to work with https://github.com/obogo/ux-angularjs-datagrid
 * However, it should work with other tables as well.
 */
angular.module('go', [])
    .directive('goResizeColumns', function () {
        return {
            restrict: 'EA',
            scope: true,
            template: '<div ng-repeat="col in cols" ng-mousedown="drag($index)"></div>',
            link: function (scope, el, attr) {
                el.addClass('col-resize');// more convenient styles.
                // selector must be able to select header rows->cols and child rows->cols.
                var selectValue = scope.$eval(attr.selector);
                var selection = angular.element(document.querySelector(selectValue));
                var body = angular.element(document.body);
                var offsetX = 0;
                var dragCol;
                var cols = [];
                var width;
                scope.cols = cols;
                scope.drag = drag;

                /**
                 * update all of the sizes of the elements found.
                 */
                function updateChildren() {
                    if (dragCol) {
                        return;
                    }
                    var children = selection.children();
                    var len = children.length;
                    var col;
                    var colEl;
                    width = el[0].offsetWidth;
                    for (var i = 0; i < len; i += 1) {
                        colEl = el[0].children[i];
                        col = cols[i] || {height: children[i].offsetHeight};
                        col.index = i;
                        col.width = children[i].offsetWidth;
                        col.left = (cols[i - 1] && cols[i - 1].left || 0) + col.width;
                        cols[i] = col;
                    }
                    renderCols();
                }

                function updateCol(index, left) {
                    cols[index].left = left;
                }

                function renderCols() {
                    var len = cols.length;
                    for (var i = 0; i < len; i += 1) {
                        updateColValues(i);
                        renderCol(cols[i]);
                    }
                }

                function updateColValues(index) {
                    // everything calculated off of the left.
                    var col = cols[index];
                    var prev = cols[index - 1];
                    col.width = col.left - (prev && prev.left || 0);
                }

                /**
                 * Apply sizes to the dom elements.
                 * @param col
                 */
                function renderCol(col) {
                    if (el[0].children[col.index]) {
                        el[0].children[col.index].style.left = col.left + 'px';
                        el[0].children[col.index].style.height = col.height + 'px';
                        if (selection[0].children[col.index]) {
                            //console.log((prev && col.left - prev.left || 0) + 'px !important');
                            selection[0].children[col.index].style.width = col.width + 'px';
                            // this had to use div: to be specific enough. If styles are too specific for widths, this will not work.
                            col.selection = col.selection || selectValue + ' > div:nth-child(' + (col.index + 1) + ')';
                            col.rule = col.rule || hb.cssRules.get(col.selection) || hb.cssRules.add(col.selection, 'width:' + col.width + 'px;');
                            col.rule.style.width = col.width + 'px';
                        }
                    }
                }

                function drag(index) {
                    console.log('drag', index);
                    dragCol = cols[index];
                    offsetX = el[0].offsetLeft;
                    selection[0].style.pointerEvents = 'none';
                    body.on('mousemove', onMove);
                    body.on('mouseup', drop);
                }

                // Throttle this for performance.
                var onMove = hb.throttle(function (evt) {
                    //console.log('move', evt.pageX - offsetX);
                    updateCol(dragCol.index, evt.pageX - offsetX);
                    renderCols();
                    scope.$digest();
                }, 20);

                function drop(evt) {
                    console.log('drop');
                    body.off('mousemove', onMove);
                    body.off('mouseup', drop);
                    dragCol = null;
                    selection[0].style.pointerEvents = null;
                }

                /**
                 * remove all of the styles we added.
                 */
                function reset() {
                    drop();// just in case.
                    var i, len, col;
                    for (i = 0, len = cols.length; i < len; i += 1) {
                        col = cols[index];
                        if (col.rule) {
                            hb.cssRules.remove(col.selection);
                            col.rule = null;
                        }
                    }
                }

                scope.$watch(updateChildren);
                scope.$on('colResize::reset', reset);// so they can be reset externally.
                scope.$on('$destroy', reset);
                angular.element(window).on('resize', updateChildren);
            }
        };
    });