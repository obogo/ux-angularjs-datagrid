exports.datagrid.events.DOUBLE_SCROLL_SCROLL_TO_TOP = "datagrid:doubleScrollScrollToTop";
exports.datagrid.events.DOUBLE_SCROLL_SCROLL_TO_BOTTOM = "datagrid:doubleScrollScrollToBottom";
/**
 * Allow a header to scroll out before scrolling the content. Nested scrollers.
 */
angular.module('ux').directive('uxDoubleScroll', function () {

    return {
        link: function (scope, element, attr) {
            var result = exports.logWrapper('doubleScroll', {}, 'red', function () {
                    scope.$emit.apply(scope, arguments);
                }),
                el = element[0],
                selector = scope.$eval(attr.uxDoubleScroll),
                target,
                targetOffset = scope.$eval(attr.targetOffset) || 0,
                grid, // reference to the datagrid instance
                myScroll,// iScroll for the doubleScroll.
                scrollModel, // the grid scrollModel.
                enabled, unwatchRender, unwatchOffset, lastOffsetTop = 0, lastOffsetHeight, intv,
                lastY = 0, momentum = 0, gridScrollIntv;

            function setup() {
                element[0].style.overflowY = 'auto';
                element[0].style.overflowX = 'hidden';
                updateScrollModel();
                updateTarget();
                scope.doubleScroll = result;

                scope.$on(exports.datagrid.events.RESIZE, checkOffsetChange);

                if (exports.datagrid.isIOS) {
                    setupIScroll();
                } else {
                    setupNativeScroll();
                }
                unwatchOffset = scope.$watch(function () {
                    // wait until a render is all done. Then check the heights.
                    clearTimeout(intv);
                    intv = setTimeout(checkOffsetChange, 100);
                });
            }

            function setupNativeScroll() {
                element[0].addEventListener('scroll', onScroll, true);
                if (target && grid.isReady()) {// if this exists the ready event should have already been fired.
                    checkOffsetChange();
                    onScroll(null);
                } else {
                    unwatchRender = scope.$on(exports.datagrid.events.ON_LISTENERS_READY, function () {
                        unwatchRender();
                        updateTarget();
                        checkOffsetChange();
                        onScroll(null);
                    });
                }
                scope.$on(exports.datagrid.events.ON_SCROLL_STOP, function () {
                    updateScrollModel();
                    clearInterval(gridScrollIntv);
                    if (!grid.values.scroll) {
                        gridScrollIntv = setInterval(function () {
                            if (element[0].scrollTop > 0.1) {
                                element[0].scrollTop *= 0.1;
                            } else {
                                element[0].scrollTop = 0;
                                clearInterval(gridScrollIntv);
                            }
                        }, 10);
                    } else {
                        element[0].scrollTop = element[0].scrollHeight - element[0].offsetHeight;
                    }
                });
            }

            function setupIScroll() {
                myScroll = new IScroll(element[0], {
                    bounce: false,
                    mouseWheel: true,
                    bindToWrapper: true,
                    click: true
                });
                myScroll.on('scrollStart', function () {
                    if (enabled) {
                        checkOffsetChange();
                        updateLastScroll(scrollModel.iScroll, myScroll);
                    }
                });
                myScroll.on('scrollEnd', function () {
                    var sm = scrollModel || updateScrollModel();
                    // if we are at the end. We need to enable to grid scroller.
                    if (myScroll.y <= myScroll.maxScrollY) {
                        disable();
                    }
                });
                scope.$on(exports.datagrid.events.ON_SCROLL_START, function () {
                    var sm = scrollModel || updateScrollModel();
                    if (sm.iScroll) {
                        sm.iScroll.options.bounce = false;
                    }
                    if (!enabled && sm.iScroll.y >= 0) {
                        enable();
                    } else if (enabled && sm.iScroll.enabled) {
                        sm.iScroll.disable();
                    }
                });
                scope.$on(exports.datagrid.events.ON_SCROLL_STOP, function () {
                    if (!enabled && scrollModel.iScroll.y >= 0) {
                        enable();
                    }
                });

                unwatchRender = scope.$on(exports.datagrid.events.ON_LISTENERS_READY, function () {
                    // it needs to start off with the target disabled.
                    unwatchRender();
                    updateScrollModel();
                    updateTarget();
                    checkOffsetChange();
                    unwatchRender = scope.$on(exports.datagrid.events.ON_AFTER_RENDER, function () {
                        var sm = scrollModel || updateScrollModel();
                        unwatchRender();
                        checkOffsetChange();
                        enable();
                    });
                });

                function updateLastScroll(myIScroll, otherIScroll) {
                    lastY = myIScroll.y;
                    momentum = 0;
                    clearInterval(gridScrollIntv);
                    gridScrollIntv = setInterval(function () {
                        var style = window.getComputedStyle(element[0].children[0]),
                            y = parseInt(style.webkitTransform.match(/(\-?\d+)\)$/)[1], 10);
                        if (y !== lastY) {
                            momentum = y - lastY;
                            lastY = y;
                            if (y === otherIScroll.maxScrollY) {
                                clearInterval(gridScrollIntv);
                                gridScrollIntv = setTimeout(function () {
                                    clearTimeout(gridScrollIntv);
                                    disable();
                                    myIScroll.scrollBy(0, momentum * 5, 500);
                                }, 0);
                            }
                        }
                    }, 10);
                }
            }

            function enable() {
                if (exports.datagrid.isIOS && !enabled) {
                    if (scrollModel && scrollModel.iScroll) {
                        scrollModel.iScroll.scrollTo(0, 0);
                        scrollModel.iScroll.disable();
                    }
                    myScroll.enable();
                    myScroll.scrollTo(0, 0, 500);
                } else if (!enabled) {
                    element[0].scrollTop = 0;
                    target.scrollTop = 0;
                }
                enabled = true;
            }

            function disable() {
                if (exports.datagrid.isIOS && enabled) {
                    myScroll.scrollTo(0, myScroll.maxScrollY);
                    myScroll.disable();
                    scrollModel.iScroll.enable();
                    scrollModel.iScroll.scrollBy(0, -1);
                } else if (!exports.datagrid.isIOS) {
                    element[0].scrollTop = element[0].scrollHeight - element[0].offsetHeight;
                }
                enabled = false;
            }

            function updateTarget() {
                if (!target) {
                    target = element[0].querySelector(selector);
                }
            }

            function updateScrollModel() {
                var s = scope.$$childHead;
                while (s) {
                    if (s.datagrid) {
                        grid = s.datagrid;
                        scrollModel = s.datagrid && s.datagrid.scrollModel;
                        return scrollModel;
                    }
                    s = s.$$nextSibling;
                }
                return scrollModel;
            }

            function onScroll(event) {
                result.log("onScroll");
                updateTarget();
                if (target) {
                    if (el.scrollTop + el.offsetHeight < el.scrollHeight) {
                        if (target.style.overflowY !== 'hidden') {
                            result.log("\ttarget.overflowY = hidden");
                            target.style.overflowY = 'hidden';
                        }
                    } else if (target.style.overflowY !== 'auto') {
                        result.log("\ttarget.overflowY = auto");
                        target.style.overflowY = 'auto';
                    }
                } else {
                    throw new Error(selector ? "selector \"" + selector + "\" did not select any objects" : "double scroll requires a selector.");
                }
            }

            function checkOffsetChange() {
                var offsetTop = calculateOffsetTop(),
                    offsetHeight = element[0].offsetHeight;
                if (lastOffsetTop !== offsetTop || lastOffsetHeight !== offsetHeight) {
                    if (onSizeChange(offsetTop)) {
                        lastOffsetTop = offsetTop;
                        lastOffsetHeight = offsetHeight;
                    }
                }
            }

            function calculateOffsetTop() {
                var content = element.children(),
                    children = content.children(),
                    i = 0, len = children.length,
                    offsetTop = 0;
                while (i < len) {
                    if (children[i] === target || children[i].contains(target)) {
                        break;
                    }
                    offsetTop += children[i].offsetHeight;
                    i += 1;
                }
                return offsetTop;
            }

            function onSizeChange(offsetTop) {
                result.log('onSizeChange');
                if (target) {
                    var s = angular.element(target).scope(),
                        content = element.children(),
                        elHeight = element[0].offsetHeight,
                        contentHeight;
                    contentHeight = offsetTop + elHeight - targetOffset;
                    target.style.height = elHeight - targetOffset + 'px';
                    content[0].style.height = contentHeight + 'px';
                    s.datagrid.updateHeights();
                    if (exports.datagrid.isIOS) {
                        myScroll.refresh();
                    }
                    return true;
                }
                updateTarget();
                return false;
            }

            result.resize = function resize(height) {
                result.log('resize');
                if (height !== undefined) {
                    element[0].style.height = height + "px";
                }
                checkOffsetChange();
            };

            result.scrollToTop = function () {
                enable();
            };

            result.scrollToBottom = function () {
                disable();
            };

            scope.$on('$destroy', function () {
                unwatchOffset();
                clearTimeout(intv);
                result.destroyLogger();
                result = null;
                if (exports.datagrid.isIOS) {
                    myScroll.destroy();
                    myScroll = null;
                } else {
                    element[0].removeEventListener('scroll', onScroll);
                }
            });


            setup();
        }
    };
});
