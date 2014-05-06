/*
* uxDatagrid v.0.6.6
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
exports.datagrid.events.COLLAPSE_ROW = "datagrid:collapseRow";

exports.datagrid.events.EXPAND_ROW = "datagrid:expandRow";

exports.datagrid.events.TOGGLE_ROW = "datagrid:toggleRow";

exports.datagrid.events.ROW_TRANSITION_COMPLETE = "datagrid:rowTransitionComplete";

exports.datagrid.options.expandRows = [];

exports.datagrid.options.expandRows.autoClose = true;

angular.module("ux").factory("expandRows", function() {
    //TODO: on change row template. This needs to collapse the row.
    return function(inst) {
        var intv, result = exports.logWrapper("expandRows", {}, "green", inst.dispatch), lastGetIndex, cache = {}, opened = {}, states = {
            opened: "opened",
            closed: "closed"
        }, superGetTemplateHeight = inst.templateModel.getTemplateHeight, // transition end lookup.
        dummyStyle = document.createElement("div").style, vendor = function() {
            var vendors = "t,webkitT,MozT,msT,OT".split(","), t, i = 0, l = vendors.length;
            for (;i < l; i++) {
                t = vendors[i] + "ransform";
                if (t in dummyStyle) {
                    return vendors[i].substr(0, vendors[i].length - 1);
                }
            }
            return false;
        }(), TRNEND_EV = function() {
            if (vendor === false) return false;
            var transitionEnd = {
                "": "transitionend",
                webkit: "webkitTransitionEnd",
                Moz: "transitionend",
                O: "oTransitionEnd",
                ms: "MSTransitionEnd"
            };
            return transitionEnd[vendor];
        }();
        dummyStyle = null;
        function getIndex(itemOrIndex) {
            lastGetIndex = typeof itemOrIndex === "number" ? itemOrIndex : inst.getNormalizedIndex(itemOrIndex, lastGetIndex);
            return lastGetIndex;
        }
        function setup(item) {
            item.template = item.template || inst.templateModel.defaultName;
            if (!item.cls && !item.style && !item.swap) {
                throw new Error("expandRows will not work without an cls|style|swap property");
            }
            cache[item.template] = item;
        }
        function setupTemplates() {
            ux.each(inst.options.expandRows, setup);
        }
        function getState(itemOrIndex) {
            var index = getIndex(itemOrIndex);
            return opened[index] ? states.opened : states.closed;
        }
        function toggle(itemOrIndex) {
            if (getState(itemOrIndex) === states.closed) {
                expand(itemOrIndex);
            } else {
                collapse(itemOrIndex);
            }
        }
        function expand(itemOrIndex) {
            var index = getIndex(itemOrIndex);
            if (getState(index) === states.closed) {
                autoClose([ index ]);
                setState(index, states.opened);
            }
        }
        function collapse(itemOrIndex) {
            var index = getIndex(itemOrIndex);
            if (getState(index) === states.opened) {
                setState(index, states.closed);
            }
        }
        function autoClose(omitIndexes) {
            if (inst.options.expandRows.autoClose) {
                closeAll(omitIndexes);
            }
        }
        function closeAll(omitIndexes) {
            exports.each(opened, function(cacheItemData, index) {
                var intIndex = parseInt(index, 10);
                if (!omitIndexes || inst.rowsLength > intIndex && omitIndexes.indexOf(intIndex) === -1) {
                    collapse(intIndex);
                }
            });
        }
        function setState(index, state) {
            var template = inst.templateModel.getTemplate(inst.data[index]), elm, tpl, swapTpl;
            if (cache[template.name]) {
                elm = inst.getRowElm(index);
                elm.scope().$state = state;
                tpl = cache[template.name];
                if (tpl.transition !== false) {
                    elm[0].addEventListener(TRNEND_EV, onTransitionEnd);
                }
                if (tpl.style) {
                    if (!tpl.reverse) {
                        tpl.reverse = makeReverseStyle(elm, tpl.style);
                    }
                    elm.css(state === states.opened ? tpl.style : tpl.reverse);
                }
                if (tpl.swap && tpl.state !== state) {
                    swapTpl = cache[tpl.swap];
                    inst.templateModel.setTemplate(index, tpl.swap, [ swapTpl.cls ]);
                    elm = inst.getRowElm(index);
                } else if (tpl.cls) {
                    elm[state === states.opened ? "addClass" : "removeClass"](tpl.cls);
                    elm.addClass("animating");
                }
                if (tpl.transition === false) {
                    // we need to wait for the heights to update before updating positions.
                    var evt = {
                        target: elm[0],
                        index: index,
                        state: state
                    };
                    if (inst.options.chunks.detachDom) {
                        setTimeout(function() {
                            onTransitionEnd(evt);
                        }, 0);
                    } else {
                        onTransitionEnd(evt);
                    }
                }
            } else {
                throw new Error("unable to toggle template. cls for template '" + template.name + "' was not set.");
            }
        }
        function makeReverseStyle(elm, style) {
            var params = {
                elm: elm,
                style: style,
                reverse: {}
            };
            ux.each(style, reverseStyle, params);
            return params.reverse;
        }
        function reverseStyle(value, key, list, params) {
            params.reverse[key] = params.elm.css(key);
        }
        function onTransitionEnd(event) {
            var elm = angular.element(event.target), s = elm.scope(), index, state;
            if (event.hasOwnProperty("index")) {
                index = event.index;
                state = event.state;
            }
            if (state && s) {
                s.$index = index;
                s.$state = state;
            } else if (s) {
                index = s.$index;
                state = s.$state;
            }
            elm[0].removeEventListener(TRNEND_EV, onTransitionEnd);
            elm.removeClass("animating");
            if (state === states.opened) {
                opened[index] = {
                    index: index,
                    height: parseInt(elm[0].offsetHeight || 0, 10)
                };
                if (isNaN(opened[index].height)) {
                    throw new Error("Invalid Height");
                }
            } else {
                delete opened[index];
            }
            if (s) {
                inst.safeDigest(s);
            }
            inst.updateHeights(index);
            // we told the heights to update. Give time for them to change then fire the event.
            clearTimeout(intv);
            intv = setTimeout(function() {
                clearTimeout(intv);
                // check for last row. On expansion it needs to scroll down.
                if (state === states.opened && index === inst.data.length - 1 && inst.getViewportHeight() < inst.getContentHeight()) {
                    inst.scrollModel.scrollToBottom(true);
                }
                inst.scrollModel.scrollIntoView(index, true);
                inst.dispatch(exports.datagrid.events.ROW_TRANSITION_COMPLETE);
            }, 0);
        }
        function isExpanded(itemOrIndex) {
            var index = getIndex(itemOrIndex);
            return !!opened[index];
        }
        function getTemplateHeight(item) {
            var index = getIndex(item);
            if (opened[index]) {
                result.log("	expandRow %s to height %s", index, opened[index].height);
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
        result.toggle = toggle;
        result.expand = expand;
        result.collapse = collapse;
        result.isExpanded = isExpanded;
        result.destroy = destroy;
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_READY, setupTemplates));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.EXPAND_ROW, function(event, itemOrIndex) {
            result.expand(itemOrIndex);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.COLLAPSE_ROW, function(event, itemOrIndex) {
            result.collapse(itemOrIndex);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.TOGGLE_ROW, function(event, itemOrIndex) {
            result.toggle(itemOrIndex);
        }));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_ROW_COMPILE, function(event, $s, el) {
            if (opened[$s.$index]) {
                var template = inst.templateModel.getTemplate(inst.data[$s.$index]), tpl = cache[template.name];
                el[0].classList.add(tpl.cls);
            }
        }));
        if (exports.datagrid.events.ON_BEFORE_TOGGLE_SORT) {
            inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_TOGGLE_SORT, function(event, columnName) {
                closeAll();
            }));
        }
        inst.expandRows = result;
        return inst;
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
