angular.module('ux').factory('collapsibleGroups', function () {
   return function (dg) {
       var result = exports.logWrapper('collapsibleGroups', {}, 'orange', dg.dispatch),
           lastIndex = 0,
           collapsed = {}, superGetTemplateHeight = dg.templateModel.getTemplateHeight,
           states = {
               COLLAPSE: 'collapse',
               EXPAND: 'expand'
           };

       function getIndex(itemOrIndex) {
           lastIndex = typeof itemOrIndex === "number" ? itemOrIndex : dg.getNormalizedIndex(itemOrIndex, lastIndex);
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
           var item = dg.getRowItem(index);
           return !!(item && dg.grouped && item[dg.grouped] && item[dg.grouped].length);
       }

       function setRowStatesInGroup(rowIndex, state) {
           var i = 0, item = dg.getRowItem(rowIndex), len = item[dg.grouped].length, changed;
           while (i < len) {
               if (state === states.COLLAPSE) {
                   changed = collapse(rowIndex + i + 1);
               } else {
                   changed = expand(rowIndex + i + 1);
               }
               if (changed) {
                   dg.chunkModel.updateAllChunkHeights(rowIndex);
               }
               changed = false;
               i += 1;
           }
           dg.updateHeights();
       }

       function collapse(index) {
           var el;
           if (!isCollapsed(index)) {
               el = dg.getRowElm(index)[0];
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
               el = dg.getRowElm(index)[0];
               el.style.display = collapsed[index].prevDisplay;
               delete collapsed[index];
               return true;
           }
           return false;
       }

       result.collapse = function (rowIndexOrGroup) {
           var index = getIndex(rowIndexOrGroup);
           setRowStatesInGroup(index, states.COLLAPSE);
           dg.render();
       };

       result.expand = function (rowIndexOrGroup) {
           var index = getIndex(rowIndexOrGroup);
           setRowStatesInGroup(index, states.EXPAND);
           dg.render();
       };

       result.toggle = function toggle(itemOrIndex) {
           var index = getIndex(itemOrIndex);
           if (isCollapsible(index)) {
               return isCollapsed(index) ? result.expand(index) : result.collapse(index);
           }
           return false;
       };

       dg.templateModel.getTemplateHeight = function getTemplateHeight(item) {
           var index = getIndex(item);
           if (collapsed[index]) {
               return collapsed[index].height;
           }
           return superGetTemplateHeight(item);
       };

       dg.collapsibleGroups = result;

       return dg;
   };
});