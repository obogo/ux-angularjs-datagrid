exports.datagrid.events.COLLAPSE_ROW = "datagrid:collapseRow";
exports.datagrid.events.EXPAND_ROW = "datagrid:expandRow";
exports.datagrid.events.TOGGLE_ROW = "datagrid:toggleRow";
exports.datagrid.events.ROW_TRANSITION_COMPLETE = "datagrid:rowTransitionComplete";
exports.datagrid.events.COLLAPSE_ALL_EXPANDED_ROWS = "datagrid:collapseAllExpandedRows";
exports.datagrid.options.expandRows = [];
exports.datagrid.options.expandRows.autoClose = true;
exports.datagrid.options.expandRows.scrollOnExpand = true;
exports.datagrid.options.expandRows.store = true;
angular.module('ux').factory('expandRows', function () {
    var store = {};
    function getStore() {
        var path = document.location.href;
        store[path] = store[path] || {};
        return store[path];
    }
    return ['inst', function (inst) {
        var result = exports.logWrapper('expandRows', {}, 'green', inst),
            lastGetIndex,
            cache = {},
            opened = getStore(),
            opening = false,
            states = {
                opened: "opened", closed: "closed"
            },
            superGetTemplateHeight = inst.templateModel.getTemplateHeight,

        // transition end lookup.
            dummyStyle = document.createElement('div').style,
            vendor = (function () {
                var vendors = 't,webkitT,MozT,msT,OT'.split(','),
                    t,
                    i = 0,
                    l = vendors.length;

                for ( ; i < l; i++ ) {
                    t = vendors[i] + 'ransform';
                    if ( t in dummyStyle ) {
                        return vendors[i].substr(0, vendors[i].length - 1);
                    }
                }

                return false;
            })(),
            TRNEND_EV = (function () {
                if ( vendor === false ) return false;

                var transitionEnd = {
                        ''			: 'transitionend',
                        'webkit'	: 'webkitTransitionEnd',
                        'Moz'		: 'transitionend',
                        'O'			: 'oTransitionEnd',
                        'ms'		: 'MSTransitionEnd'
                    };

                return transitionEnd[vendor];
            })();

        dummyStyle = null;

        function getIndex(itemOrIndex) {
            lastGetIndex = typeof itemOrIndex === "number" ? itemOrIndex : inst.getNormalizedIndex(itemOrIndex, lastGetIndex);
            return lastGetIndex;
        }

        function setup(item) {
            item.template = item.template || inst.templateModel.defaultName;
            if (!item.cls && !item.style && !item.swap) {
                inst.throwError("expandRows will not work without an cls|style|swap property");
            }
            cache[item.template] = item;
        }

        function setupTemplates() {
            ux.each(inst.options.expandRows, setup);
        }

        function getState(itemOrIndex) {
            var index = getIndex(itemOrIndex);
            return opened[index] && opened[index].name || states.closed;
        }

        function getType(type) {
            return type && type || 'opened';
        }

        function toggle(itemOrIndex, type) {
            type = getType(type);
            if (getState(itemOrIndex) !== type) {
                expand(itemOrIndex, type);
            } else {
                collapse(itemOrIndex);
            }
        }

        function expand(itemOrIndex, type) {
            type = getType(type);
            var index = getIndex(itemOrIndex);
            if (getState(index) !== type) {
                result.log("expand %s", itemOrIndex);
                // prevent multi-finger expand rows.
                if (inst.options.expandRows.autoClose && opening) {
                    return;
                }
                opening = true;
                autoClose([index], true);
                opening = true;
                setState(index, type);
            }
        }

        function collapse(itemOrIndex, immediate) {
            var index = getIndex(itemOrIndex);
            if (getState(index) !== states.closed) {
                result.log("collapse %s", itemOrIndex);
                setState(index, states.closed, immediate);
            }
        }

        function autoClose(omitIndexes, immediate) {
            if (inst.options.expandRows.autoClose) {
                closeAll(omitIndexes, false, immediate);
            }
        }

        function closeAll(omitIndexes, silent, immediate) {
            exports.each(opened, function (cacheItemData, index) {
                var intIndex = parseInt(index, 10);
                if (!omitIndexes || (inst.rowsLength > intIndex && omitIndexes.indexOf(intIndex) === -1)) {
                    if (silent) {
                        collapse(intIndex, true);
                        delete opened[index];
                    } else {
                        collapse(intIndex, immediate);
                    }
                }
            });
            opening = false;
        }

        function setState(index, state, immediate) {
            var template = inst.templateModel.getTemplate(inst.data[index], state), elm, tpl, swapTpl, s, visible, swap;
            if (cache[template.name]) {
                elm = inst.getExistingRow(index);
                s = inst.scopes[index];
                visible = elm && elm.scope() || false;
                if (!elm || !s) { // we must be closing a row out of view. possibly destroyed.
                    delete opened[index];
                    return;
                }
                s.$state = state;
                tpl = cache[template.name];
                if (visible && tpl.transition !== false) {
                    elm[0].addEventListener(TRNEND_EV, onTransitionEnd);
                }
                if (tpl.style) {
                    if (!tpl.reverse) {
                        tpl.reverse = makeReverseStyle(elm, tpl.style);
                    }
                    elm.css(state !== states.closed ? tpl.style : tpl.reverse);
                }
                if (tpl.swap && tpl.state !== state) {
                    swap = state === states.closed ? runSwap(tpl, state) : state;
                    swapTpl = cache[swap];
                    swapTpl.cls = swapTpl.cls || '';
                    inst.templateModel.setTemplate(index, swap, [swapTpl.cls]);
                    elm = inst.getRowElm(index);
                } else if (tpl.cls) {
                    elm[(state !== states.closed ? "addClass" : "removeClass")](tpl.cls);
                    elm.addClass('animating');
                }
                // we need to wait for the heights to update before updating positions.
                var evt = {target: elm[0], index:index, state:state};
                if (immediate) {
                    onTransitionEnd(evt, immediate);
                } else {
                    inst.flow.add(onTransitionEnd, [evt], 0);
                }
            } else {
                inst.throwError("unable to toggle template. cls for template '" + template.name + "' was not set.");
            }
        }

        function runSwap(tpl, state) {
            return typeof tpl.swap === 'function' ? tpl.swap(inst.data[index], state) : tpl.swap;
        }

        function makeReverseStyle(elm, style) {
            var params = {elm: elm, style: style, reverse: {}};
            ux.each(style, reverseStyle, params);
            return params.reverse;
        }

        function reverseStyle(value, key, list, params) {
            params.reverse[key] = params.elm.css(key);
        }

        function onTransitionEnd(event, immediate) {
            var elm, s, index, state;
            if (exports.util.apply(Object.prototype.hasOwnProperty, event, ['index'])) {
                elm = inst.getRowElm(event.index);
                index = event.index;
                state = event.state;
            } else {
                elm = angular.element(event.target);
            }
            s = elm.scope();
            if (state && s) {
                s.$index = index;
                s.$state = state;
            } else if (s) {
                index = s.$index;
                state = s.$state;
            }
            elm[0].removeEventListener(TRNEND_EV, onTransitionEnd);
            elm.removeClass('animating');
            if (state !== states.closed) {
                opened[index] = {
                    name: state,
                    index: index,
                    height: parseInt(elm[0].offsetHeight || 0, 10)
                };
                if (isNaN(opened[index].height)) {
                    inst.throwError("Invalid Height");
                }
            } else {
                delete opened[index];
            }

            inst.updateHeights(index);
            // if opening and collapsing a row at the same time, we don't want to do this twice.
            if (immediate) {
                opening = false;
            } else {
                // we told the heights to update. Give time for them to change then fire the event.
                inst.flow.add(function () {
                    if (inst.options.expandRows.scrollOnExpand) {
                        inst.scrollModel.scrollIntoView(index, true);
                    }
                    inst.dispatch(exports.datagrid.events.ROW_TRANSITION_COMPLETE);
                    opening = false;

                    if (inst.options.expandRows.scrollOnExpand) {
                        inst.flow.add(function () {
                            // check for last row. On expansion it needs to scroll down.
                            if (state !== states.closed && index === inst.data.length - 1 && inst.getViewportHeight() < inst.getContentHeight()) {
                                inst.scrollModel.scrollToBottom(true);
                            }
                        }, [], 0);
                    }
                }, [], 0);
            }
        }

        function isExpanded(itemOrIndex) {
            var index = getIndex(itemOrIndex);
            return !!opened[index];
        }

        function getTemplateHeight(item) {
            var index = getIndex(item);
            if (opened[index]) {
                result.log("\texpandRow %s to height %s", index, opened[index].height);
                return opened[index].height;
            }
            return superGetTemplateHeight(item);
        }

        function destroy() {
            result = null;
            cache = null;
            opened = null;
            states = null;
        }

        // override the getTemplateHeight to return the result with the expanded height.
        inst.templateModel.getTemplateHeight = getTemplateHeight;

        result.states = states;
        result.getIndex = getIndex;
        result.toggle = function(itemOrIndex, type) {
            inst.flow.add(toggle, [itemOrIndex, type]);
        };
        result.expand = function (itemOrIndex, type) {
            inst.flow.add(expand, [itemOrIndex, type]);
        };
        result.collapse = function (itemOrIndex) {
            inst.flow.add(collapse, [itemOrIndex]);
        };
        result.isExpanded = isExpanded;
        result.getState = getState;
        result.destroy = destroy;

        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_READY, setupTemplates));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.EXPAND_ROW, function (event, itemOrIndex) {
            result.expand(itemOrIndex);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.COLLAPSE_ROW, function (event, itemOrIndex) {
            result.collapse(itemOrIndex);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.TOGGLE_ROW, function (event, itemOrIndex, type) {
            result.toggle(itemOrIndex, type);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_ROW_COMPILE, function (event, $s, el) {
            if (opened[$s.$index]) {
                var template = inst.templateModel.getTemplate(inst.data[$s.$index]),
                    tpl = cache[template.name];
                el[0].classList.add(tpl.cls);
            }
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.COLLAPSE_ALL_EXPANDED_ROWS, function (event, silent) {
            closeAll(null, silent);
        }));

        if (exports.datagrid.events.ON_BEFORE_TOGGLE_SORT) {
            inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_TOGGLE_SORT, function (event) {
                closeAll();
            }));
        }

        // inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_DATA_CHANGE, function (event) {
        //     closeAll(null, true);
        // }));

        inst.expandRows = result;

        return inst;
    }];
});
