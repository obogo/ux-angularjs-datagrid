exports.datagrid.events.RENDER_PROGRESS = "datagrid:renderProgress";
exports.datagrid.coreAddons.creepRenderModel = function creepRenderModel(exp) {

    var intv = 0,
        percent = 0,
        creepCount = 0;

    function digest(index) {
        var s = exp.scopes[index];
        if (!s || !s.digested) {// just skip if already digested.
            exp.forceRenderScope(index);
        }
    }

    function calculatePercent() {
        var result = {count: 0};
        each(exp.scopes, calculateScopePercent, result);
        return result.count / exp.rowsLength;
    }

    function calculateScopePercent(s, index, list, result) {
        result.count += s ? 1 : 0;
    }

    function onInterval(started, ended) {
        var upIndex = started, downIndex = ended, time = Date.now() + exp.options.renderThreshold;
        while (time > Date.now() && (upIndex >= 0 || downIndex < exp.rowsLength)) {
            if (upIndex >= 0) {
                digest(upIndex);
                upIndex -= 1;
            }
            if (downIndex < exp.rowsLength) {
                digest(downIndex);
                downIndex += 1;
            }
        }
        percent = calculatePercent();
        stop();
        creepCount += 1;
        if (!exp.values.speed && exp.scopes.length < exp.rowsLength) {
            resetInterval(upIndex, downIndex);
        }
        exp.dispatch(exports.datagrid.events.RENDER_PROGRESS, percent);
    }

    function stop() {
        intv = false;
    }

    function resetInterval(started, ended) {
        stop();
        if (creepCount < exp.options.creepLimit) {
            exp.flow.add(onInterval, [started, ended], exp.options.renderThreshold);
            intv = true;
        }
    }

    function onAfterUpdateWatchers(event, loopData) {
        if (!intv) {
            creepCount = 0;
            resetInterval(loopData.started, loopData.ended);
        }
    }

    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.BEFORE_UPDATE_WATCHERS, stop));
    exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.AFTER_UPDATE_WATCHERS, onAfterUpdateWatchers));
};
exports.datagrid.coreAddons.push(exports.datagrid.coreAddons.creepRenderModel);