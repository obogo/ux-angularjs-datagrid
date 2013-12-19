/*global angular */
exports.datagrid.coreAddons.templateModel = function templateModel(exp) {
    'use strict';

    function trim(str) {
        // remove newline / carriage return
        str = str.replace(/\n/g, "");
        // remove whitespace (space and tabs) before tags
        str = str.replace(/[\t ]+</g, "<");
        // remove whitespace between tags
        str = str.replace(/>[\t ]+</g, "><");
        // remove whitespace after tags
        str = str.replace(/>[\t ]+$/g, ">");
        return str;
    }

    exp.templateModel = function () {

        var templates = [], totalHeight, defaultName = 'default', result = {};

        function createTemplates() {
            var i, scriptTemplates = exp.element[0].getElementsByTagName('script'), len = scriptTemplates.length;
            if (!len) {
                throw new Error("at least one template is required.");
            }
            for (i = 0; i < len; i += 1) {
                createTemplate(scriptTemplates[i]);
            }
            while (scriptTemplates.length) {
                exp.element[0].removeChild(scriptTemplates[0]);
            }
        }

        function createTemplate(scriptTemplate) {
            var template = trim(angular.element(scriptTemplate).html()),
                wrapper = document.createElement('div'),
                name = scriptTemplate.attributes['data-template-name'].nodeValue || defaultName,
                templateData;
            template = angular.element(template)[0];
            template.className += ' ' + exp.options.uncompiledClass + ' {{$status}}';
            template.setAttribute('template', name);
            wrapper.appendChild(template);
            document.body.appendChild(wrapper);
            template = trim(wrapper.innerHTML);
            templateData = {
                name: name,
                item: scriptTemplate.attributes['data-template-item'].nodeValue,
                template: template,
                height: wrapper.offsetHeight
            };
            templates[templateData.name] = templateData;
            templates.push(templateData);
            document.body.removeChild(wrapper);
            totalHeight = 0;// reset cached value.
            return templateData;
        }

        function getTemplates() {
            return templates;
        }

        /**
         * Use the data object from each item in the array to determine the template for that item.
         * @param data
         */
        function getTemplate(data) {
            return getTemplateByName(data._template);
        }

        //TODO: need to make this method so it can be overwritten to look up templates a different way.

        function getTemplateName(el) {
            return el.attr ? el.attr('template') : el.getAttribute('template');
        }

        function getTemplateByName(name) {
            if (templates[name]) {
                return templates[name];
            }
            return templates[defaultName];
        }

        function dynamicHeights() {
            var i, h;
            for (i in templates) {
                if (templates.hasOwnProperty(i)) {
                    h = h || templates[i].height;
                    if (h !== templates[i].height) {
                        return true;
                    }
                }
            }
            return false;
        }

        function averageTemplateHeight() {
            var i = 0, len = templates.length;
            if (!totalHeight) {
                while (i < len) {
                    totalHeight += templates[i].height;
                    i += 1;
                }
            }
            return totalHeight / len;
        }

        function countTemplates() {
            return templates.length;
        }

        function getTemplateHeight(item) {
            return getTemplate(item).height;
        }

        function getHeight(list, startRowIndex, endRowIndex) {
            var i = startRowIndex, height = 0;
            if (!list.length) {
                return 0;
            }
            while (i <= endRowIndex) {
                height += result.getTemplateHeight(list[i]);
                i += 1;
            }
            return height;
        }

        function setTemplate(itemOrIndex, newTemplateName) {
            var item = typeof itemOrIndex === "number" ? exp.data[itemOrIndex] : itemOrIndex;
            var oldTemplate = item._template;
            item._template = newTemplateName;
            exp.dispatch(exports.datagrid.events.ROW_TEMPLATE_CHANGE, item, oldTemplate, newTemplateName);
        }

        function destroy() {
            templates.length = 0;
            templates = null;
        }

        result = {
            defaultName: defaultName,
            createTemplates: createTemplates,
            getTemplates: getTemplates,
            getTemplate: getTemplate,
            getTemplateName: getTemplateName,
            getTemplateByName: getTemplateByName,
            templateCount: countTemplates,
            dynamicHeights: dynamicHeights,
            averageTemplateHeight: averageTemplateHeight,
            getHeight: getHeight,
            getTemplateHeight: getTemplateHeight,
            setTemplate: setTemplate,
            destroy: destroy
        };

        return result;
    }();

    return exp.templateModel;
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.templateModel);