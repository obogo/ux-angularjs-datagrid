exports.datagrid.events.RENDER_PROGRESS = "datagrid:renderProgress";
exports.datagrid.coreAddons.creepRenderModel = function creepRenderModel(exp) {

    var intv = 0,
        renderIntv = 0,
        percent,
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

    function onInterval(started, ended) {
        time = Date.now() + exp.options.renderThreshold;
        upIndex = started;
        downIndex = ended;
        render(onComplete);
    }

    function wait(method, time) {
        var i, args = exports.util.array.toArray(arguments);
        if (exp.options.async) {
            i = setTimeout.apply(null, args);
        } else {
            args.splice(0, 2);
            method.apply(this, args);
        }
        return i;
    }

    function render(complete) {
        if (time > Date.now() && (upIndex >= 0 || downIndex < exp.rowsLength)) {
            if (upIndex >= 0) {
                digest(upIndex);
                upIndex -= 1;
            }
            if (downIndex < exp.rowsLength) {
                digest(downIndex);
                downIndex += 1;
            }
            percent = calculatePercent();
            renderIntv = wait(render, 0, complete);
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
        exp.dispatch(exports.datagrid.events.RENDER_PROGRESS, percent);
    }

    function stop() {
        time = 0;
        clearTimeout(intv);
        intv = 0;
    }

    function resetInterval(started, ended, waitTime) {
        stop();
        if (creepCount < exp.options.creepLimit) {
            intv = wait(onInterval, waitTime || exp.options.renderThreshold, started, ended);
        }
    }

    function onBeforeRender(event) {
        stop();
    }

    function onAfterRender(event, loopData) {
        creepCount = 0;
        resetInterval(loopData.started, loopData.ended, 500);
    }

    model.stop = stop; // allow external stop of creep render.

    model.destroy = function destroy() {
        exp = null;
        model = null;
    };

    exp.creepRenderModel = model;

    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.BEFORE_VIRTUAL_SCROLL_START, onBeforeRender));
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.ON_VIRTUAL_SCROLL_UPDATE, onBeforeRender));
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.SCROLL_START, onBeforeRender));
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.AFTER_UPDATE_WATCHERS, onAfterRender));
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.creepRenderModel);