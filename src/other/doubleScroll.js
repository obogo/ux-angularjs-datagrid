exports.datagrid.events.DOUBLE_SCROLL_SCROLL_TO_TOP = "datagrid:doubleScrollScrollToTop";
exports.datagrid.events.DOUBLE_SCROLL_SCROLL_TO_BOTTOM = "datagrid:doubleScrollScrollToBottom";
/**
 * Allow a header to scroll out before scrolling the content. Nested scrollers.
 */
angular.module('ux').directive('uxDoubleScroll', function () {
    return {
        link: function (scope, element, attr) {

            var el = element[0], lastValue = 0, unwatchRender,
                result = exports.logWrapper('doubleScroll', {}, 'red', function () {
                    scope.$emit.apply(scope, arguments);
                }),
                selector = scope.$eval(attr.uxDoubleScroll),
                target,
                vScroll, contentHeight = 0, elHeight = 0, targetOffset = scope.$eval(attr.targetOffset) || 0,
                scrollModel;

            element[0].style.overflowY = 'auto';
            element[0].style.overflowX = 'hidden';

//            element.css({webkitOverflowScrolling: 'touch'});
            updateTarget();
            updateScrollModel();

            function updateTarget() {
                if (!target) {
                    target = element[0].querySelector(selector);
                }
            }

            function updateScrollModel() {
                scrollModel = scope.datagrid && scope.datagrid.scrollModel || {};
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

            function onIOSUpdateValues(values) {
                onIOSScroll(values.scroll);
            }

            function onIOSScroll(value) {
                result.log("onIOSScroll");
                var s;
                if (vScroll.enable() && value !== lastValue) {
                    lastValue = value;
                    vScroll.content.css({webkitTransform: "translate3d(0px, " + (element[0].scrollTop - value) + "px, 0px)"});
                }
                if (value === 0) {
                    s = angular.element(target).scope();
                    if (s) {
                        onTargetScrollToTop(event, s.datagrid.scrollModel, 0);
                    }
                }
            }

            function scrollToTop() {
                result.log('scrollToTop');
                var enabled;
                if (exports.datagrid.isIOS) {
                    enabled = vScroll.enable();
                    vScroll.enable(true);
                    vScroll.scrollTo(0, true);
                    vScroll.enable(enabled);
                } else {
                    el.scrollTop = 0;
                }
            }

            function scrollToBottom() {
                result.log('scrollToBottom');
                var enabled;
                if (exports.datagrid.isIOS) {
                    enabled = vScroll.enable();
                    vScroll.enable(true);
                    vScroll.scrollToBottom(true);
                    vScroll.enable(enabled);
                } else {
                    el.scrollTop = el.scrollHeight - el.offsetHeight;
                }
            }

            function onSizeChange() {
                result.log('onSizeChange');
                var content = element.children();
                elHeight = element[0].offsetHeight;
                target.style.height = elHeight - targetOffset + 'px';
                content.children()[1].style.height = elHeight + 'px';
                contentHeight = content.children()[0].offsetHeight + elHeight;
                content[0].style.height = contentHeight + 'px';
                scope.datagrid.upateViewportHeight();
            }

            function onTargetScrollToTop(event, scroller, speed) {
                result.log('onTargetScrollToTop');
                // we only want the scroll event from the target.
                if (scroller.element[0] === target && scrollModel.enable()) {
                    scrollModel.enable(false);
                    vScroll.enable(true, speed);
                    target.disabled = 'disabled';
                }
            }

            function onDoubleScrollBottom(event, scroller, speed) {
                result.log('onDoubleScrollBottom');
                // we only want the double scroll bottom.
                if (scroller.element[0] === element[0]) {
                    vScroll.enable(false);
                    scrollModel.enable(true, speed);
                    target.disabled = '';
                }
            }

            if (exports.datagrid.isIOS) {
                result.log('is iOS');
                vScroll = ux.datagrid.VirtualScroll(scope, element, {}, onIOSUpdateValues, onIOSScroll);
                vScroll.setup();
                result.virtualScroll = vScroll;
                unwatchRender = scope.$on(exports.datagrid.events.ON_LISTENERS_READY, function () {
                    // it needs to start off with the target disabled.
                    unwatchRender();
                    updateScrollModel();
                    updateTarget();
                    onSizeChange();
                    onIOSScroll(0);
                    unwatchRender = scope.$on(exports.datagrid.events.ON_AFTER_RENDER, function () {
                        unwatchRender();
                        onTargetScrollToTop(null, scrollModel, 0.05);
                        onSizeChange();
                    });
                });
                scope.$on(exports.datagrid.events.VIRTUAL_SCROLL_TOP, onTargetScrollToTop);
                scope.$on(exports.datagrid.events.VIRTUAL_SCROLL_BOTTOM, onDoubleScrollBottom);
            } else {
                element[0].addEventListener('scroll', onScroll, true);
                if (target) {// if this exists the ready event should have already been fired.
                    onSizeChange();
                    onScroll(null);
                } else {
                    unwatchRender = scope.$on(exports.datagrid.events.ON_LISTENERS_READY, function () {
                        unwatchRender();
                        updateTarget();
                        onSizeChange();
                        onScroll(null);
                    });
                }
            }

            result.resize = function resize(height) {
                result.log('resize');
                if (height !== undefined) {
                    element[0].style.height = height + "px";
                }
                onSizeChange();
            };

            result.scrollToBottom = function () {
                result.log('scrollToBottom');
                if (vScroll) {
                    vScroll.scrollToBottom();
                } else {
                    element[0].scrollTop = element.children().children()[0].offsetHeight;
                }
            };

            scope.doubleScroll = result;

            scope.$on(exports.datagrid.events.RESIZE, onSizeChange);
            scope.$on(exports.datagrid.events.DOUBLE_SCROLL_SCROLL_TO_TOP, scrollToTop);
            scope.$on(exports.datagrid.events.DOUBLE_SCROLL_SCROLL_TO_BOTTOM, scrollToBottom);

            scope.$on('$destroy', function () {
                result.destroyLogger();
                result = null;
                if (exports.datagrid.isIOS) {
                    vScroll.destroy();
                    vScroll = null;
                } else {
                    element[0].removeEventListener('scroll', onScroll);
                }
            });

        }
    };
});