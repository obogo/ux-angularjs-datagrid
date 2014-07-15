exports.datagrid.events.COLLAPSE_GROUP = "datagrid:collapseGroup";
exports.datagrid.events.EXPAND_GROUP = "datagrid:expandGroup";
exports.datagrid.events.TOGGLE_GROUP = "datagrid:toggleGroup";
angular.module('ux').factory('collapsibleGroups', function () {
   return ['inst', function (inst) {
       var result = exports.logWrapper('collapsibleGroups', {}, 'orange', inst.dispatch),
           lastIndex = 0,
           regroup = [],
           collapsed = {}, superGetTemplateHeight = inst.templateModel.getTemplateHeight,
           states = {
               COLLAPSE: 'collapse',
               EXPAND: 'expand'
           };

       function getIndex(itemOrIndex) {
           lastIndex = typeof itemOrIndex === "number" ? itemOrIndex : inst.getNormalizedIndex(itemOrIndex, lastIndex);
           return lastIndex;
       }

       function isCollapsed(index) {
           var collapsible = isCollapsible(index);
           if (collapsible) {
               return !!collapsed[index + 1];
           }
           return !!collapsed[index];
       }

       function isCollapsible(index) {
           var item = inst.getRowItem(index);
           return !!(item && inst.grouped && item[inst.grouped] && item[inst.grouped].length);
       }

       function setRowStatesInGroup(rowIndex, state) {
           var i = 0, item = inst.getRowItem(rowIndex), len = item[inst.grouped].length, changed;
           while (i < len) {
               if (state === states.COLLAPSE) {
                   changed = collapse(rowIndex + i + 1);
               } else {
                   changed = expand(rowIndex + i + 1);
               }
               changed = false;
               i += 1;
           }
           inst.updateHeights();
       }

       function collapse(index) {
           var el;
           if (!isCollapsed(index)) {
               el = inst.getRowElm(index)[0];
               collapsed[index] = {
                   prevDisplay: el.style.display,
                   height: 0
               };
               el.style.display = 'none';
               return true;
           }
           return false;
       }

       function expand(index) {
           var el;
           if (isCollapsed(index)) {
               el = inst.getRowElm(index)[0];
               el.style.display = collapsed[index].prevDisplay;
               delete collapsed[index];
               return true;
           }
           return false;
       }

       result.collapse = function (rowIndexOrGroup) {
           var index = getIndex(rowIndexOrGroup);
           setRowStatesInGroup(index, states.COLLAPSE);
       };

       result.expand = function (rowIndexOrGroup) {
           var index = getIndex(rowIndexOrGroup);
           setRowStatesInGroup(index, states.EXPAND);
       };

       result.toggle = function toggle(itemOrIndex) {
           var index = getIndex(itemOrIndex);
           if (isCollapsible(index)) {
               return isCollapsed(index) ? result.expand(index) : result.collapse(index);
           }
           return false;
       };

       inst.templateModel.getTemplateHeight = function getTemplateHeight(item) {
           var index = getIndex(item);
           if (collapsed[index]) {
               return collapsed[index].height;
           }
           return superGetTemplateHeight(item);
       };

       inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.EXPAND_GROUP, function (event, index) {
           result.expand(index);
       }));
       inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.COLLAPSE_GROUP, function (event, index) {
           result.collapse(index);
       }));
       inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.TOGGLE_GROUP, function (event, index) {
           result.toggle(index);
       }));

       inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_DATA_CHANGE, function (event) {
           // build up list of collapsed groups that we can re-collapse after data is rendered in.
           var item, i, prev;
           regroup.length = 0;
           for (i in collapsed) {
               if (Object.prototype.hasOwnProperty.apply(collapsed, [i])) {
                   item = collapsed[i];
                   prev = inst.getRowItem(i - 1);
                   if (prev && prev[inst.grouped]) {
                       regroup.push(i - 1);
                   }
               }
           }
           collapsed = {};
       }));

       inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_RENDER_AFTER_DATA_CHANGE, function (event) {
           exports.each(regroup, result.collapse);
       }));

       inst.collapsibleGroups = result;

       return inst;
   }];
});