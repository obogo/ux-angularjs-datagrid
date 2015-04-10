/*!
* ux-angularjs-datagrid v.1.2.1
* (c) 2015, Obogo
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

exports.datagrid.events.DOUBLE_SCROLL_SCROLL_TO_TOP = "datagrid:doubleScrollScrollToTop";

exports.datagrid.events.DOUBLE_SCROLL_SCROLL_TO_BOTTOM = "datagrid:doubleScrollScrollToBottom";

/**
 * Allow a header to scroll out before scrolling the content. Nested scrollers.
 */
angular.module("ux").directive("uxDoubleScroll", [ "$window", function($window) {
    return {
        link: function(scope, element, attr) {
            var result = exports.logWrapper("doubleScroll", {}, "red", function() {
                scope.$emit.apply(scope, arguments);
            }), el = element[0], selector = scope.$eval(attr.uxDoubleScroll), target, targetOffset = scope.$eval(attr.targetOffset) || 0, dynamicOffset = scope.$eval(attr.dynamicOffset), targetPadding = scope.$eval(attr.targetPadding), grid, // reference to the datagrid instance
            myScroll, // iScroll for the doubleScroll.
            scrollModel, // the grid scrollModel.
            enabled, unwatchRender, unwatchOffset, lastOffsetTop = 0, lastOffsetHeight, intv, lastY = 0, momentum = 0, gridScrollIntv, useIScroll = detectIScroll();
            function detectIScroll() {
                var addons = element[0].querySelectorAll(".datagrid")[0].attributes.getNamedItem("data-addons");
                if (addons && addons.value.match(/iScrollAddon/)) {
                    return true;
                }
                return false;
            }
            function setup() {
                element[0].style.overflowY = "auto";
                element[0].style.overflowX = "hidden";
                updateScrollModel();
                updateTarget();
                scope.doubleScroll = result;
                scope.$on(exports.datagrid.events.RESIZE, checkOffsetChange);
                if (useIScroll) {
                    setupIScroll();
                } else {
                    setupNativeScroll();
                }
                unwatchOffset = scope.$watch(onWatchOffset);
            }
            function onWatchOffset() {
                // wait until a render is all done. Then check the heights.
                clearTimeout(intv);
                intv = setTimeout(function() {
                    if (checkOffsetChange()) {
                        onWatchOffset();
                    }
                }, 100);
            }
            function setupNativeScroll() {
                element[0].addEventListener("scroll", onScroll, true);
                if (target && grid.isReady()) {
                    // if this exists the ready event should have already been fired.
                    checkOffsetChange();
                    onScroll(null);
                } else {
                    unwatchRender = scope.$on(exports.datagrid.events.ON_LISTENERS_READY, function() {
                        unwatchRender();
                        updateTarget();
                        checkOffsetChange();
                        onScroll(null);
                        enable();
                        if (grid.scrollHistory && grid.scrollHistory.getCurrentScroll()) {
                            disable();
                        }
                        scope.$on(exports.datagrid.events.ON_RENDER_AFTER_DATA_CHANGE, function() {
                            if (enabled && grid.getContentHeight() && grid.getContentHeight() < grid.getViewportHeight()) {
                                grid.scrollModel.removeTouchEvents();
                            }
                        });
                    });
                }
                scope.$on(exports.datagrid.events.ON_SCROLL_STOP, function() {
                    updateScrollModel();
                    clearInterval(gridScrollIntv);
                    if (grid.values.scroll <= 0) {
                        gridScrollIntv = setInterval(function() {
                            if (element[0].scrollTop > .1) {
                                element[0].scrollTop *= .1;
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
                myScroll.on("scrollStart", function() {
                    if (enabled) {
                        checkOffsetChange();
                        updateLastScroll(scrollModel.iScroll, myScroll);
                    }
                });
                myScroll.on("scrollEnd", function() {
                    var sm = scrollModel || updateScrollModel();
                    // if we are at the end. We need to enable to grid scroller.
                    if (myScroll.y <= myScroll.maxScrollY) {
                        disable();
                    }
                });
                scope.$on(exports.datagrid.events.ON_SCROLL_START, function() {
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
                scope.$on(exports.datagrid.events.ON_SCROLL_STOP, function() {
                    if (!enabled && scrollModel.iScroll.y >= 0) {
                        enable();
                    }
                });
                scope.$on(exports.datagrid.events.AFTER_SCROLL_HISTORY_INIT_SCROLL, function() {
                    if (scrollModel.scrollHistory && scrollModel.scrollHistory.getCurrentScroll()) {
                        myScroll.enable();
                        myScroll.scrollTo(0, myScroll.maxScrollY);
                    }
                });
                unwatchRender = scope.$on(exports.datagrid.events.ON_LISTENERS_READY, function() {
                    // it needs to start off with the target disabled.
                    unwatchRender();
                    updateScrollModel();
                    updateTarget();
                    checkOffsetChange();
                    unwatchRender = scope.$on(exports.datagrid.events.ON_AFTER_RENDER, function() {
                        var sm = scrollModel || updateScrollModel();
                        unwatchRender();
                        checkOffsetChange();
                        enable();
                        if (grid.scrollHistory && grid.scrollHistory.getCurrentScroll()) {
                            disable();
                        }
                    });
                });
                function updateLastScroll(myIScroll, otherIScroll) {
                    lastY = myIScroll.y;
                    momentum = 0;
                    clearInterval(gridScrollIntv);
                    gridScrollIntv = setInterval(function() {
                        var style = window.getComputedStyle(element[0].children[0]), y;
                        if (!style) {
                            clearInterval(gridScrollIntv);
                        } else {
                            y = parseInt(style.webkitTransform.match(/(\-?\d+)\)$/)[1], 10);
                            if (y !== lastY) {
                                momentum = y - lastY;
                                lastY = y;
                                if (y === otherIScroll.maxScrollY) {
                                    clearInterval(gridScrollIntv);
                                    gridScrollIntv = setTimeout(function() {
                                        clearTimeout(gridScrollIntv);
                                        disable();
                                        myIScroll.scrollBy(0, momentum * 5, 500);
                                    }, 0);
                                }
                            }
                        }
                    }, 10);
                }
            }
            function enable() {
                result.log("enable doubleScroll disable scroll");
                if (useIScroll && !enabled) {
                    if (scrollModel && scrollModel.iScroll && (!grid.scrollHistory || !grid.scrollHistory.getCurrentScroll())) {
                        result.log("	scroll grid to 0");
                        scrollModel.iScroll.scrollTo(0, 0);
                        scrollModel.iScroll.disable();
                    }
                    myScroll.enable();
                    if (grid.getContentHeight() > grid.getViewportHeight()) {
                        myScroll.scrollTo(0, 0);
                    }
                } else if (!enabled) {
                    element[0].scrollTop = 0;
                    target.scrollTop = 0;
                }
                enabled = true;
            }
            function disable() {
                result.log("disable doubleScroll enable scroll");
                if (useIScroll && enabled) {
                    myScroll.scrollTo(0, myScroll.maxScrollY);
                    myScroll.disable();
                    scrollModel.iScroll.enable();
                    scrollModel.iScroll.scrollBy(0, -1);
                } else if (!useIScroll) {
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
                        if (target.style.overflowY !== "hidden") {
                            result.log("	target.overflowY = hidden");
                            target.style.overflowY = "hidden";
                        }
                    } else if (target.style.overflowY !== "auto") {
                        result.log("	target.overflowY = auto");
                        target.style.overflowY = "auto";
                    }
                } else {
                    throw new Error(selector ? 'selector "' + selector + '" did not select any objects' : "double scroll requires a selector.");
                }
            }
            function checkOffsetChange() {
                var offsetTop = calculateOffsetTop(), offsetHeight = element[0].offsetHeight;
                if (lastOffsetTop !== offsetTop || lastOffsetHeight !== offsetHeight) {
                    if (onSizeChange(offsetTop)) {
                        lastOffsetTop = offsetTop;
                        lastOffsetHeight = offsetHeight;
                        return true;
                    }
                } else if (!enabled && target && target.children[0] && target.children[0].offsetHeight + targetOffset < offsetHeight) {
                    enable();
                }
                return false;
            }
            function calculateOffsetTop() {
                var cpStyle, paddingTop, paddingBottom, content = element.children(), children = content.children(), i = 0, len = children.length, offsetTop = 0;
                while (i < len) {
                    if (children[i] === target || children[i].contains(target)) {
                        break;
                    }
                    //TODO: need to add padding and margin as well.
                    cpStyle = $window.getComputedStyle(children[i]);
                    if (targetPadding !== false) {
                        paddingTop = parseInt(cpStyle.paddingTop, 10);
                        paddingBottom = parseInt(cpStyle.paddingBottom, 10);
                    } else {
                        paddingTop = 0;
                        paddingBottom = 0;
                    }
                    offsetTop += children[i].offsetHeight + paddingTop + paddingBottom;
                    i += 1;
                }
                if (dynamicOffset) {
                    targetOffset = offsetTop;
                }
                return offsetTop;
            }
            function onSizeChange(offsetTop) {
                result.log("onSizeChange");
                if (target) {
                    var s = angular.element(target).scope(), content = element.children(), elHeight = element[0].offsetHeight, contentHeight;
                    contentHeight = offsetTop + elHeight - targetOffset;
                    target.style.height = elHeight - targetOffset + "px";
                    content[0].style.height = contentHeight + "px";
                    s.datagrid.updateHeights();
                    if (useIScroll) {
                        myScroll.refresh();
                        if (s.datagrid.scrollHistory && !s.datagrid.scrollHistory.isComplete()) {
                            myScroll.scrollTo(0, myScroll.maxScrollY);
                        }
                    }
                    return true;
                }
                updateTarget();
                return false;
            }
            result.resize = function resize(height) {
                result.log("resize");
                if (height !== undefined) {
                    element[0].style.height = height + "px";
                }
                checkOffsetChange();
            };
            result.scrollToTop = function() {
                enable();
            };
            result.scrollToBottom = function() {
                disable();
            };
            scope.$on("$destroy", function() {
                unwatchOffset();
                clearTimeout(intv);
                clearInterval(gridScrollIntv);
                result.destroyLogger();
                result = null;
                if (useIScroll) {
                    myScroll.destroy();
                    myScroll = null;
                } else {
                    element[0].removeEventListener("scroll", onScroll);
                }
            });
            setup();
        }
    };
} ]);
}(this.ux = this.ux || {}, function() {return this;}()));
