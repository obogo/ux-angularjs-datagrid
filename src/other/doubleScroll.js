/**
 * Allow a header to scroll out before scrolling the content. Nested scrollers.
 */
angular.module('ux').directive('uxDoubleScroll', function () {
    return {
        link: function (scope, element, attr) {

            var el = element[0], lastValue = 0,
                selector = scope.$eval(attr.uxDoubleScroll),
                target = element[0].querySelector(selector),
                vScroll, contentHeight = 0, elHeight = 0,
                scrollModel = scope.datagrid && scope.datagrid.scrollModel || {};

//            element.css({webkitOverflowScrolling: 'touch'});

            function onScroll(event) {
                if (target) {
                    if (el.scrollTop + el.offsetHeight <= el.scrollHeight) {
                        target.style.overflow = 'hidden';
                    } else {
                        target.style.overflow = 'auto';
                    }
                } else {
                    throw new Error("double scroll requires a selector.");
                }
            }

            function onIOScroll(value) {
                if (vScroll.enabled && value !== lastValue) {
                    lastValue = value;
                    vScroll.content.css({webkitTransform: "translate3d(0px, " + (element[0].scrollTop - value) + "px, 0px)"});
                }
            }

            function onSizeChange() {
                var content = element.children();
                elHeight = element[0].offsetHeight;
                target.style.height = elHeight + 'px';
                content.children()[1].style.height = elHeight + 'px';
                contentHeight = content.children()[0].offsetHeight + elHeight;
                content[0].style.height = contentHeight + 'px';
                scope.datagrid.upateViewportHeight();
            }

            function onTargetScrollToTop(event, scroller, speed) {
                // we only want the scroll event from the target.
                if (scroller.element[0] === target) {
                    scrollModel.enable(false);
                    vScroll.enable(true, speed);
                    target.disabled = 'disabled';
                }
            }

            function onDoubleScrollBottom(event, scroller, speed) {
                // we only want the double scroll bottom.
                if (scroller.element[0] === element[0]) {
                    vScroll.enable(false);
                    scrollModel.enable(true, speed);
                    target.disabled = '';
                }
            }

            if (ux.datagrid.isIOS) {
                vScroll = ux.datagrid.VirtualScroll(scope, element, {}, onIOScroll);
                vScroll.setup();
                onSizeChange();
                onIOScroll(0);
                scope.$on(exports.datagrid.events.READY, function () {
                    // it needs to start off with the target disabled.
                    onTargetScrollToTop(null, scrollModel, 0.05);
                    onSizeChange();
                });
                scope.$on(exports.datagrid.events.VIRTUAL_SCROLL_TOP, onTargetScrollToTop);
                scope.$on(exports.datagrid.events.VIRTUAL_SCROLL_BOTTOM, onDoubleScrollBottom);
            } else {
                element[0].addEventListener('scroll', onScroll, true);
                onSizeChange();
                onScroll(null);
            }

            scope.$on(exports.datagrid.events.RESIZE, onSizeChange);

            scope.$on('$destroy', function () {
                if (isIOS) {
                    vScroll.destroy();
                    vScroll = null;
                } else {
                    element[0].removeEventListener('scroll', onScroll);
                }
            });

        }
    };
});