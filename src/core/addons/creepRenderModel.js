exports.datagrid.events.ON_RENDER_PROGRESS = "datagrid:onRenderProgress";
exports.datagrid.events.STOP_CREEP = "datagrid:stopCreep";
exports.datagrid.events.ENABLE_CREEP = "datagrid:enableCreep";
exports.datagrid.events.DISABLE_CREEP = "datagrid:disableCreep";
exports.datagrid.coreAddons.creepRenderModel = function creepRenderModel(inst) {

    var intv = 0,
        creepCount = 0,
        model = exports.logWrapper('creepModel', {}, 'blue', inst),
        upIndex = 0,
        downIndex = 0,
        waitingOnReset,
        time,
        lastPercent,
        unwatchers = [],
        forceScroll = false,
        scrollIndex = 0,
        scrollIndexPadding = 0;

    function digest(index) {
        if (inst.scope.$root.$$phase) {
            return false;
        }
        var s = inst.getScope(index);
        if (!s || !s.$digested) {// just skip if already digested.
            inst.forceRenderScope(index);
        }
        return true;
    }

    function calculatePercent() {
        var result = {count: 0};
        each(inst.scopes, calculateScopePercent, result);
        if (result.count >= inst.rowsLength) {
            model.disable();
        }
        return {count: result.count, len: inst.rowsLength};
    }

    function calculateScopePercent(s, index, list, result) {
        result.count += s ? 1 : 0;
    }

    function onInterval(started, ended, force) {
        model.log('\tonInterval');
        if (!inst.values.touchDown) {
            waitingOnReset = false;
            time = Date.now() + inst.options.renderThreshold;
            upIndex = started;
            downIndex = ended;
            render(onComplete, force);
        }
    }

    function wait(method, time) {
        model.log('wait', time);
        var args = exports.util.array.toArray(arguments);
        args.splice(0, 2);
        if (inst.options.async) {
            // clearTimeout(waitHandle);
            model.log("\tstart waiting", time);
            return setTimeout(function () {
                model.log("\twait HANDLE execute");
                // clearTimeout(waitHandle);
                exports.util.apply(method, null, args);
            }, time);
        } else {
            model.log("\twait execute");
            exports.util.apply(method, this, args);
        }
    }

    function findUncompiledIndex(index, dir) {
        while (index >= 0 && index < inst.rowsLength && inst.isCompiled(index)) {
            index += dir;
        }
        if (index >= 0 && index < inst.rowsLength) {
            return index;
        }
        return dir > 0 ? inst.rowsLength : -1;
    }

    function render(complete, force) {
        var now = Date.now(), dynamicHeights, direction;
        if (time > now && hasIndexesLeft()) {
            dynamicHeights = inst.templateModel.hasVariableRowHeights();
            direction = inst.values.direction;
            model.info('direction', direction);
            applyRender(direction, force);
            render(complete, force);// making this async was counter effective on performance.
            if (dynamicHeights) {
                forceScrollToIndex();
            }
        } else {
            complete();
        }
    }

    function applyRender(direction, force, amount) {
        amount = amount || 2;
        var fn;
        if (direction) {// optimized for the direction the grid is scrolling.
            fn = direction === -1 ? renderUp : renderDown;
            for(var i = 0; i < amount; i += 1) {
                if (!fn(force)) {
                    break;
                }
            }
        } else {// render up one and down one if not scrolling.
            renderUp(force);
            renderDown(force);
        }
    }

    function renderUp(force) {
        upIndex = force ? upIndex : findUncompiledIndex(upIndex, -1);
        if (upIndex >= 0) {
            if (digest(upIndex)) {
                if (force) {
                    model.warn("\trenderUp " + upIndex);
                }
                upIndex -= 1;
                return true;
            }
        }
    }

    function renderDown(force) {
        downIndex = force ? downIndex : findUncompiledIndex(downIndex, 1);
        if (downIndex !== inst.rowsLength) {
            if (digest(downIndex)) {
                if (force) {
                    model.warn("\trenderDown " + downIndex);
                }
                downIndex += 1;
                return true;
            }
        }
    }

    function onComplete() {
        model.info("onComplete " + creepCount + "/" + inst.options.creepLimit);
        // stop();
        if (!hasIndexesLeft()) {
            creepCount = 0;
            model.disable();
            lastPercent = 1;
            inst.dispatch(exports.datagrid.events.ON_RENDER_PROGRESS, 1);
        } else {
            creepCount += 1;
            if (!inst.values.touchDown && !inst.values.speed && hasIndexesLeft()) {
                resetInterval(upIndex, downIndex);
            }
            var percent = calculatePercent();
            if (percent !== lastPercent) {
                inst.dispatch(exports.datagrid.events.ON_RENDER_PROGRESS, percent);
            }
        }
    }

    function hasIndexesLeft() {
        return !!(upIndex > -1 || downIndex < inst.rowsLength);
    }

    function stop() {
        model.warn('stop');
        time = 0;
        clearTimeout(intv);
    }

    function resetInterval(started, ended, waitTime, forceCompileRowRender) {
        model.info('resetInterval');
        if (creepCount < inst.options.creepLimit) {
            model.info('creep ' + creepCount + '/' + inst.options.creepLimit);
            clearTimeout(intv);
            time = 0;
            intv = wait(onInterval, waitTime || inst.options.renderThresholdWait, started, ended, forceCompileRowRender);
        }
    }

    function renderLater(event, forceCompileRowRender) {
        resetInterval(upIndex, downIndex, inst.options.creepStartDelay, forceCompileRowRender);
    }

    function forceScrollToIndex() {
        forceScroll = true;
        var scroll = inst.getRowOffset(scrollIndex) + scrollIndexPadding;
        inst.scrollModel.scrollTo(scroll, true);
        forceScroll = false;
    }

    function onBeforeRender(event) {
        model.info("onBeforeRender");
        if (!forceScroll) {
            if (inst.templateModel.hasVariableRowHeights()) {
                scrollIndex = inst.getOffsetIndex(inst.values.scroll);
                scrollIndexPadding = inst.values.scroll - inst.getRowOffset(scrollIndex);
            }
        }
    }

    function onAfterRender(event, loopData, forceCompileRowRender) {
        model.info("onAfterRender");
        creepCount = 0;
        upIndex = loopData.started || 0;
        downIndex = loopData.ended || 0;
        renderLater(event, forceCompileRowRender);
    }

    function onBeforeReset(event) {
        model.info("onBeforeReset");
        onBeforeRender(event);
        if (inst.options.creepRender && inst.options.creepRender.enable !== false) {
            model.enable();
        }
    }

    model.stop = stop; // allow external stop of creep render.
    model.forceRenderNext = function() {
        model.warn("forceRenderNext");
        applyRender(inst.values.direction, true, inst.options.scrollEndRenderAmount);
    };

    model.destroy = function destroy() {
        model.disable();
        inst = null;
        model = null;
    };

    model.enable = function () {
        if (!unwatchers.length) {
            unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_UPDATE_WATCHERS, onAfterRender));
        }
    };

    model.disable = function () {
        stop();
        model.info("creep Disabled");
        while(unwatchers.length) {
            unwatchers.pop()();
        }
    };

    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.DISABLE_CREEP, model.disable));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_RESET, onBeforeReset));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.STOP_CREEP, stop));

    inst.creepRenderModel = model;
    // do not add listeners if it is not enabled.
    if (inst.options.creepRender && inst.options.creepRender.enable) {
        model.enable();
    } else {
        model.disable();
    }
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.creepRenderModel);