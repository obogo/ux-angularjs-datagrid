exports.datagrid.events.ON_RENDER_PROGRESS = "datagrid:onRenderProgress";
exports.datagrid.coreAddons.creepRenderModel = function creepRenderModel(inst) {

    var intv = 0,
        creepCount = 0,
        model = {},
        upIndex = 0,
        downIndex = 0,
        time;

    function digest(index) {
        var s = inst.getScope(index);
        if (!s || !s.digested) {// just skip if already digested.
            inst.forceRenderScope(index);
        }
    }

    function calculatePercent() {
        var result = {count: 0};
        each(inst.scopes, calculateScopePercent, result);
        return {count: result.count, len: inst.rowsLength};
    }

    function calculateScopePercent(s, index, list, result) {
        result.count += s ? 1 : 0;
    }

    function onInterval(started, ended, force) {
        if (!inst.values.touchDown) {
            time = Date.now() + inst.options.renderThreshold;
            upIndex = started;
            downIndex = ended;
            render(onComplete, force);
        }
    }

    function wait(method, time) {
        var i, args = exports.util.array.toArray(arguments);
        args.splice(0, 2);
        if (inst.options.async) {
            inst.flow.remove(method);
            i = inst.flow.add(method, args, time);
        } else {
            method.apply(this, args);
        }
        return i;
    }

    function render(complete, force) {
        var changed = false, now = Date.now();
        if (time > now && (upIndex >= 0 || downIndex < inst.rowsLength)) {
            if (upIndex >= 0) {
                changed = force || !inst.isCompiled(upIndex);
                if (changed) digest(upIndex);
                upIndex -= 1;
            }
            if (downIndex < inst.rowsLength) {
                changed = force || changed || !inst.isCompiled(downIndex);
                if (changed) digest(downIndex);
                downIndex += 1;
            }
            render(complete, force);// making this async was counter effective on performance.
        } else {
            complete();
        }
    }

    function onComplete() {
        stop();
        creepCount += 1;
        if (!inst.values.speed && inst.scopes.length < inst.rowsLength) {
            resetInterval(upIndex, downIndex);
        }
        inst.dispatch(exports.datagrid.events.ON_RENDER_PROGRESS, calculatePercent());
    }

    function stop() {
        time = 0;
        clearTimeout(intv);
        intv = 0;
    }

    function resetInterval(started, ended, waitTime, forceCompileRowRender) {
        stop();
        if (creepCount < inst.options.creepLimit) {
            intv = wait(onInterval, waitTime || inst.options.renderThresholdWait, started, ended, forceCompileRowRender);
        }
    }

    function renderLater(event, forceCompileRowRender) {
        resetInterval(upIndex, downIndex, 500, forceCompileRowRender);
    }

    function onBeforeRender(event) {
        creepCount = inst.options.creepLimit;
        stop();
    }

    function onAfterRender(event, loopData, forceCompileRowRender) {
        creepCount = 0;
        upIndex = loopData.started || 0;
        downIndex = loopData.ended || 0;
        renderLater(event, forceCompileRowRender);
    }

    model.stop = stop; // allow external stop of creep render.

    model.destroy = function destroy() {
        stop();
        inst = null;
        model = null;
    };

    inst.creepRenderModel = model;

    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.BEFORE_VIRTUAL_SCROLL_START, onBeforeRender));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_VIRTUAL_SCROLL_UPDATE, onBeforeRender));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.TOUCH_DOWN, onBeforeRender));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.SCROLL_START, onBeforeRender));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_BEFORE_RESET, onBeforeRender));
    inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_UPDATE_WATCHERS, onAfterRender));
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.creepRenderModel);