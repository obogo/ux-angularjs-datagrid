angular.module('ux').factory('expandRows', function () {
    return function (exp) {
        var result = {},
            lastGetIndex,
            cache = {},
            opened = {},
            states = {
                opened: "opened", closed: "closed"
            },
            superGetTemplateHeight = exp.templateModel.getTemplateHeight,

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
            lastGetIndex = typeof itemOrIndex === "number" ? itemOrIndex : exp.getNormalizedIndex(itemOrIndex, lastGetIndex);
            return lastGetIndex;
        }

        function setup(item) {
            item.template = item.template || exp.templateModel.defaultName;
            if (!item.expandClass) {
                throw new Error("expandRows will not work without an expandClass property");
            }
            cache[item.template] = item;
        }

        function setupTemplates() {
            ux.each(exp.options.expandRows, setup);
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
                setState(index, states.opened);
            }
        }

        function collapse(itemOrIndex) {
            var index = getIndex(itemOrIndex);
            if (getState(index) === states.opened) {
                setState(index, states.closed);
            }
        }

        function setState(index, state) {
            var template = exp.templateModel.getTemplate(exp.data[index]), elm;
            if (cache[template.name]) {
                elm = exp.getRowElm(index);
                elm.scope().$state = state;
                elm[0].addEventListener(TRNEND_EV, onTransitionEnd);
                elm[(state === states.opened ? "addClass" : "removeClass")](cache[template.name].expandClass);
            } else {
                throw new Error("unable to toggle template. expandClass for template %s was not set.", template.name);
            }
        }

        function onTransitionEnd(event) {
            var elm = angular.element(event.target),
                s = elm.scope(),
                index = s.$index,
                state = s.$state;
            elm[0].removeEventListener(TRNEND_EV, onTransitionEnd);
            if (state === states.opened) {
                opened[index] = {
                    index: index,
                    height: elm[0].offsetHeight
                };
            } else {
                delete opened[index];
            }
            exp.updateHeights(index);
        }

        function isExpanded(itemOrIndex) {
            var index = getIndex(itemOrIndex);
            return !!opened[index];
        }

        function getTemplateHeight(item) {
            var index = getIndex(item);
            if (opened[index]) {
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
        exp.templateModel.getTemplateHeight = getTemplateHeight;

        result.states = states;
        result.toggle = toggle;
        result.expand = expand;
        result.collapse = collapse;
        result.isExpanded = isExpanded;
        result.destroy = destroy;

        exp.scope.$on(ux.datagrid.events.READY, setupTemplates);

        exp.expandRows = result;

        return exp;
    };
});