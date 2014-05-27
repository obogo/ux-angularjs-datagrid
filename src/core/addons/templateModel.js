/*global angular */
/**
 * ##<a name="templateModel">templateModel</a>##
 * Management of templates for the datagrid.
 * @param inst
 * @returns {templateModel|*|Function|templateModel|templateModel}
 */
exports.datagrid.coreAddons.templateModel = function templateModel(inst) {
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

    inst.templateModel = function () {

        var templates = [], totalHeight, defaultName = 'default', result = exports.logWrapper('templateModel', {}, 'teal', inst.dispatch),
            forcedTemplates = [], templatesKey;

        function getTemplatesKey() {
            if (!templatesKey) {
                templatesKey = '$$template_' + inst.uid;
            }
            return templatesKey;
        }

        function createTemplates() {
            result.log('createTemplates');
            var i, scriptTemplates = inst.element[0].getElementsByTagName('script'), len = scriptTemplates.length;
            if (!len && !templates.length) {
                throw new Error(exports.errors.E1102);
            }
            for (i = 0; i < len; i += 1) {
                createTemplateFromScriptTemplate(scriptTemplates[i]);
            }
            // remove the script templates.
            while (scriptTemplates.length) {
                inst.element[0].removeChild(scriptTemplates[0]);
            }
        }

        function createTemplateFromScriptTemplate(scriptTemplate) {
            var name = getScriptTemplateAttribute(scriptTemplate, 'template-name') || defaultName,
                base = getScriptTemplateAttribute(scriptTemplate, 'template-base') || null,
                itemName = getScriptTemplateAttribute(scriptTemplate, 'template-item');
            return createTemplate(trim(angular.element(scriptTemplate).html()), name, itemName, base);
        }

        function createTemplatesFromData(templateData) {
            exports.each(templateData, function (tpl) {
                createTemplate(tpl.template, tpl.name, tpl.item, tpl.base);
            });
        }

        function createTemplate(template, name, itemName, base) {
            var originalTemplate = template,
                wrapper = document.createElement('div'),
                templateData;
            wrapper.className = 'grid-template-wrapper';
            template = result.prepTemplate(name, template, base);
            template = angular.element(template)[0];
            if (!base) {
                template.className += ' ' + inst.options.rowClass + ' ' + inst.options.uncompiledClass + ' {{$status}}';
            }
            template.setAttribute('template', name);
            inst.getContent()[0].appendChild(wrapper);
            wrapper.appendChild(template);
            template = trim(wrapper.innerHTML);
            templateData = {
                name: name,
                item: itemName,
                template: template,
                originalTemplate: originalTemplate,
                height: wrapper.offsetHeight
            };
            result.log('template: %s %o', name, templateData);
            if (!templateData.height) {
                if (inst.element.css('display') === 'none') {
                    result.warn("Datagrid was intialized with a display:'none' value. Templates are unable to calculate heights. Grid will not render correctly.");
                } else if (!inst.element[0].offsetHeight) {
                    throw new Error(exports.errors.E1000);
                } else {
                    throw new Error(exports.errors.E1101);
                }
            }
            templates[templateData.name] = templateData;
            templates.push(templateData);
            inst.getContent()[0].removeChild(wrapper);
            totalHeight = 0;// reset cached value.
            return templateData;
        }

        function prepTemplate(name, templateStr, base) {
            var str = '', baseTemplate;
            if (base) {
                baseTemplate = result.getTemplateByName(base);
                str = baseTemplate.originalTemplate;
                str = str.replace(new RegExp('#{3}' + name + '#{3}', 'gi'), templateStr);
                return str;
            }
            return templateStr.replace(/\#{3}[\w\d\W]+\#{3}/, '');
        }

        function getScriptTemplateAttribute(scriptTemplate, attrStr) {
            var node = scriptTemplate.attributes['data-' + attrStr] || scriptTemplate.attributes[attrStr];
            return node && node.nodeValue || '';
        }

        function getTemplates() {
            return templates;
        }

        /**
         * ###<a name="getTemplate">getTemplate</a>###
         * Use the data object from each item in the array to determine the template for that item.
         * @param data
         */
        result.getTemplate = function getTemplate(data) {
            var tpl = data[getTemplatesKey()] || data._template;
            return result.getTemplateByName(tpl);
        };

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
            var tpl = result.getTemplate(item);
            return tpl ? tpl.height : 0;
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

        function setTemplateName(item, templateName) {
            var key = getTemplatesKey();
            if (!item.hasOwnProperty(key) && forcedTemplates.indexOf(item) === -1) {
                forcedTemplates.push(item);
            }
            item[key] = templateName;
        }

        function setTemplate(itemOrIndex, newTemplateName, classes) {
            result.log('setTemplate %s %s', itemOrIndex, newTemplateName);
            var item = typeof itemOrIndex === "number" ? inst.data[itemOrIndex] : itemOrIndex;
            var oldTemplate = result.getTemplate(item).name;
            result.setTemplateName(item, newTemplateName);
            inst.dispatch(exports.datagrid.events.ON_ROW_TEMPLATE_CHANGE, item, oldTemplate, newTemplateName, classes);
        }

        function updateTemplateHeights() {
            //TODO: needs unit tested.
            var i = inst.values.activeRange.min, len = inst.values.activeRange.max - i, row, tpl, rowHeight, changed = false,
                heightCache = {};
            while (i < len) {
                tpl = result.getTemplate(inst.getData()[i]);
                if (!heightCache[tpl.name]) {
                    row = inst.getRowElm(i);
                    rowHeight = row[0].offsetHeight;
                    if (rowHeight !== tpl.height) {
                        tpl.height = rowHeight;
                        changed = true;
                    }
                }
                i += 1;
            }
            if (changed) {
                inst.updateHeights();
            }
        }

        function clearTemplate(item) {
            delete item[getTemplatesKey()];
        }

        function destroy() {
            exports.each(forcedTemplates, clearTemplate);
            forcedTemplates.length = 0;
            result.destroyLogger();
            result = null;
            templates.length = 0;
            templates = null;
            forcedTemplates = null;
        }

        result.defaultName = defaultName;
        result.prepTemplate = prepTemplate;
        result.createTemplates = createTemplates;
        result.createTemplatesFromData = createTemplatesFromData;
        result.getTemplates = getTemplates;
        result.getTemplateName = getTemplateName;
        result.getTemplateByName = getTemplateByName;
        result.templateCount = countTemplates;
        result.dynamicHeights = dynamicHeights;
        result.averageTemplateHeight = averageTemplateHeight;
        result.getHeight = getHeight;
        result.getTemplateHeight = getTemplateHeight;
        result.setTemplate = setTemplate;
        result.setTemplateName = setTemplateName;
        result.updateTemplateHeights = updateTemplateHeights;
        result.getTemplatesKey = getTemplatesKey;
        result.destroy = destroy;

        return result;
    }();

    return inst.templateModel;
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.templateModel);