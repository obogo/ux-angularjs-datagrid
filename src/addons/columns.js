/**
 * Using the properties from each template's dom we are going to read the widths and define css
 * classes based off of those.
 */
angular.module('ux').factory('columns', function () {
    return function (exp) {

        var data = {}, result = {}, elWidth = 0;

        function fetchColumns(event) {
            var templates = exp.templateModel.getTemplates(), i = 0, len = templates.length, result = {};
            ux.each(templates, extractData, result);
            data = result;
            defineCss();
        }

        function extractData(item, index, list, result) {
            var matches = item.template.match(/(data\-)?width=["'](.*?)["']/gi);
            ux.each(matches, parseMatch, result);
        }

        function parseMatch(match, index, matches, result) {
            var value = match.replace(/.*["'](.*?)["']/, "$1").split(':');
            result[value[0]] = parseValue(value[1]);
        }

        function parseValue(value) {
            var v = value.match(/(\d+[\.\d+]?)([\w%]+)/);
            return {result: value, value:parseFloat(v[1]), type:v[2]};
        }

        function defineCss(omitPercents) {
            if (elWidth) {
                ux.each(data, defineClass, omitPercents);
            }
        }

        function defineClass(item, key, list, omitPercents) {
            var selector = '.' + key;
            if (item.type === '%') {
                ux.css.createClass('columns', selector, "width: " + (!omitPercents ? getPercentWidth(item.value) : '0px') + "px;");
            } else {
                ux.css.createClass('columns', selector, "width: " + item.result + ";");
            }
        }

        function isFixed(item) {
            return item.type !== '%';
        }

        function getFixedWidthTotal() {
            var total = 0;
            ux.each(data, function (item) {
                if (isFixed(item)) {
                    total += item.value;
                }
            });
            return total;
        }

        function getPercentWidth(percent) {
            var fixedWidth = getFixedWidthTotal(), availWidth = elWidth - fixedWidth;
            return availWidth * (percent * 0.01);
        }

        function onUpdate(event) {
            var width = exp.element[0].offsetWidth;
            if (elWidth !== width) {
                elWidth = width;
                defineCss();
            }
        }

        exp.unwatchers.push(exp.scope.$on(ux.datagrid.events.READY, fetchColumns));
        exp.unwatchers.push(exp.scope.$on(ux.datagrid.events.BEFORE_UPDATE_WATCHERS, onUpdate));
        exp.unwatchers.push(exp.scope.$on(ux.datagrid.events.RESIZE, onUpdate));

        exp.columnsModel = result;
        return exp;
    };
});