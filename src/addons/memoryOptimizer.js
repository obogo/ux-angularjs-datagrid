exports.datagrid.events.ON_MEMORY_OPTIMIZED = "datagrid:onMemoryOptimized";
angular.module('ux').factory('memoryOptimizer', function () {
   return ['inst', function (inst) {
       inst.options.memoryOptimizer = inst.options.memoryOptimizer || {};
       var result = exports.logWrapper('memoryOptimizer', {}, 'red', inst),
           pendingCount = 0,
           intv,
           defaultOptions = {
               range: inst.options.creepLimit * 2 || 200
           },
           options = inst.options.memoryOptimizer = exports.extend(defaultOptions, inst.options.memoryOptimizer);

       /**
        * ###<a name="disableCreep">disableCreep</a>###
        * Since this will fight against creep render creepRender if the values are not in range values will
        * be factored to remain in range.
        */
       function disableCreep() {
           inst.options.creepRender = inst.options.creepRender || {};
           if (inst.options.creepLimit > options.range * 0.5) {
               inst.options.creepLimit = options.range * 0.5;
           }
           inst.creepRenderModel.disable();
       }

       /**
        * ###<a name="optimizeRows">optimizeRows</a>###
        * We are going to remove rows that are outside of our threshold range. This will access all chunks that are not
        * in the active range and remove their dom and destroy their scopes.
        */
       function optimizeRows() {
           clearPending();
           pendingCount += 1;
           if (pendingCount > inst.options.creepLimit) {
               // the grid hasn't had enough time to catch up. force cleanup to prevent a memory crash.
               result.warn("---- FORCE CLEANUP ----");
               _optimizeRows();
           } else {
               intv = setTimeout(_optimizeRows, 1000);
           }
       }

       function clearPending() {
           clearTimeout(intv);
           intv = 0;
       }

       function _optimizeRows() {
           result.warn("optomizeRows");
           // first we need to destroy each scope that is not active.
           var i = 0, iLen = inst.scopes.length, indexes, chunk, chunks = {}, chunksLength = 0;
           while (i < iLen) {
               if (inst.scopes[i] && !inRange(i)) {
                   indexes = inst.chunkModel.getRowIndexes(i);
                   indexes.pop(); // drop off the row. we only want it's parent chunk.
                   chunk = inst.chunkModel.getItemByIndexes(indexes);
                   if (!chunks[chunk.getId()]) {
                       chunks[chunk.getId()] = chunk;
                       chunksLength += 1;
                   }
               }
               i += 1;
           }
           if (chunksLength) {
               exports.each(chunks, decompileChunk);
               inst.gc();
               inst.updateLinks();
           }
           pendingCount = 0;
       }

       /**
        * ###<a name="decompileChunk">decompileChunk</a>###
        * Decompile the chunk and destroy scopes and dom.
        * @param chunk
        */
       function decompileChunk(chunk) {
           result.warn("\tdecompile %s %s-%s", chunk.getId(), chunk.min, chunk.max);
           var i = chunk.min, iLen = chunk.max;
           while (i <= iLen) {
               if (inst.scopes[i]) {
                   var s = inst.scopes[i];
                   inst.activateScope(s);
                   s.$$prevSibling = null;
                   s.$$nextSibling = null;
                   s.$destroy();
                   inst.scopes[i] = null;
               }
               i += 1;
           }
           chunk.decompile(inst.options.chunks.chunkReadyClass);
       }

       /**
        * ###<a name="inRange">inRange</a>###
        * Check to see if the index is within the activeRange plus options range.
        * @param index
        * @returns {boolean}
        */
       function inRange(index) {
           var min = inst.values.activeRange.min - options.range, max = inst.values.activeRange.max + options.range;
           min = min < 0 ? 0 : min;
           return index >= min && index < max;
       }

       inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_DATA_CHANGE, clearPending));
       inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_RENDER_PROGRESS, optimizeRows));// creep render.
       inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_UPDATE_WATCHERS, optimizeRows));

       disableCreep();
       inst.memoryOptimizer = result;
       return inst;
   }];
});