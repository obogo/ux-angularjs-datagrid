exports.datagrid.events.ON_RENDER_PROGRESS = "datagrid:onRenderProgress";
exports.datagrid.events.STOP_CREEP = "datagrid:stopCreep";
exports.datagrid.events.ENABLE_CREEP = "datagrid:enableCreep";
exports.datagrid.events.DISABLE_CREEP = "datagrid:disableCreep";
exports.datagrid.coreAddons.creepRenderModel = function creepRenderModel(inst) {

    var intv = 0,
        creepCount = 0,
        model = exports.logWrapper('creepModel', {}, 'blue', inst.dispatch),
        upIndex = 0,
        downIndex = 0,
        waitHandle,
        waitingOnReset,
        time,
        lastPercent,
        unwatchers = [];

    function digest(index) {
        var s = inst.getScope(index);
        if (!s || !s.$digested) {// just skip if already digested.
            inst.forceRenderScope(index);
        }
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
        if (!inst.values.touchDown) {
            waitingOnReset = false;
            time = Date.now() + inst.options.renderThreshold;
            upIndex = started;
            downIndex = ended;
            render(onComplete, force);
        }
    }

    function wait(method, time) {
        var args = exports.util.array.toArray(arguments);
        args.splice(0, 2);
        if (inst.options.async) {
            clearTimeout(waitHandle);
            waitHandle = setTimeout(function () {
                method.apply(null, args);
            }, time);
        } else {
            method.apply(this, args);
        }
        return waitHandle;
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
        var now = Date.now();
        if (time > now && hasIndexesLeft()) {
            upIndex = force ? upIndex : findUncompiledIndex(upIndex, -1);
            if (upIndex >= 0) {
                digest(upIndex);
                if (force) upIndex -= 1;
            }
            downIndex = force ? downIndex : findUncompiledIndex(downIndex, 1);
            if (downIndex !== inst.rowsLength) {
                digest(downIndex);
                if (force) downIndex += 1;
            }
            render(complete, force);// making this async was counter effective on performance.
        } else {
            complete();
        }
    }

    function onComplete() {
        stop();
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
        time = 0;
        clearTimeout(intv);
        clearTimeout(waitHandle);
        intv = 0;
    }

    function resetInterval(started, ended, waitTime, forceCompileRowRender) {
        stop();
        if (creepCount < inst.options.creepLimit) {
            intv = wait(onInterval, waitTime || inst.options.renderThresholdWait, started, ended, forceCompileRowRender);
        }
    }

    function renderLater(event, forceCompileRowRender) {
        resetInterval(upIndex, downIndex, inst.options.creepStartDelay, forceCompileRowRender);
    }

    function onBeforeRender(event) {
        stop();
    }

    function onAfterRender(event, loopData, forceCompileRowRender) {
        creepCount = 0;
        upIndex = loopData.started || 0;
        downIndex = loopData.ended || 0;
        renderLater(event, forceCompileRowRender);
    }

    function onBeforeReset(event) {
        onBeforeRender(event);
        if (inst.options.creepRender && inst.options.creepRender.enable !== false) {
            model.enable();
        }
    }

    model.stop = stop; // allow external stop of creep render.

    model.destroy = function destroy() {
        model.disable();
        stop();
        inst = null;
        model = null;
    };

    model.enable = function () {
        if (!unwatchers.length) {
            unwatchers.push(inst.scope.$on(exports.datagrid.events.BEFORE_VIRTUAL_SCROLL_START, onBeforeRender));
            unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_VIRTUAL_SCROLL_UPDATE, onBeforeRender));
            unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_TOUCH_DOWN, onBeforeRender));
            unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_SCROLL_START, onBeforeRender));
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