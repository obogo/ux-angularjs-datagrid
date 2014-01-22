exports.datagrid.events.RENDER_PROGRESS = "datagrid:renderProgress";
exports.datagrid.coreAddons.creepRenderModel = function creepRenderModel(exp) {

    var intv = 0,
        creepCount = 0,
        model = {},
        upIndex = 0,
        downIndex = 0,
        time;

    function digest(index) {
        var s = exp.getScope(index);
        if (!s || !s.digested) {// just skip if already digested.
            exp.forceRenderScope(index);
        }
    }

    function calculatePercent() {
        var result = {count: 0};
        each(exp.scopes, calculateScopePercent, result);
        return {count: result.count, len: exp.rowsLength};
    }

    function calculateScopePercent(s, index, list, result) {
        result.count += s ? 1 : 0;
    }

    function onInterval(started, ended, force) {
        if (!exp.values.touchDown) {
            time = Date.now() + exp.options.renderThreshold;
            upIndex = started;
            downIndex = ended;
            render(onComplete, force);
        }
    }

    function wait(method, time) {
        var i, args = exports.util.array.toArray(arguments);
        args.splice(0, 2);
        if (exp.options.async) {
            exp.flow.remove(method);
            i = exp.flow.add(method, args, time);
        } else {
            method.apply(this, args);
        }
        return i;
    }

    function render(complete, force) {
        var changed = false, now = Date.now();
        if (time > now && (upIndex >= 0 || downIndex < exp.rowsLength)) {
            if (upIndex >= 0) {
                changed = force || !exp.isCompiled(upIndex);
                if (changed) digest(upIndex);
                upIndex -= 1;
            }
            if (downIndex < exp.rowsLength) {
                changed = force || changed || !exp.isCompiled(downIndex);
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
        if (!exp.values.speed && exp.scopes.length < exp.rowsLength) {
            resetInterval(upIndex, downIndex);
        }
        exp.dispatch(exports.datagrid.events.RENDER_PROGRESS, calculatePercent());
    }

    function stop() {
        time = 0;
        clearTimeout(intv);
        intv = 0;
    }

    function resetInterval(started, ended, waitTime, forceCompileRowRender) {
        stop();
        if (creepCount < exp.options.creepLimit) {
            intv = wait(onInterval, waitTime || exp.options.renderThresholdWait, started, ended, forceCompileRowRender);
        }
    }

    function renderLater(event, forceCompileRowRender) {
        resetInterval(upIndex, downIndex, 500, forceCompileRowRender);
    }

    function onBeforeRender(event) {
        creepCount = exp.options.creepLimit;
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
        exp = null;
        model = null;
    };

    exp.creepRenderModel = model;

    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.BEFORE_VIRTUAL_SCROLL_START, onBeforeRender));
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.ON_VIRTUAL_SCROLL_UPDATE, onBeforeRender));
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.TOUCH_DOWN, onBeforeRender));
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.SCROLL_START, onBeforeRender));
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.ON_RESET, onBeforeRender));
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.ON_AFTER_UPDATE_WATCHERS, onAfterRender));
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.creepRenderModel);