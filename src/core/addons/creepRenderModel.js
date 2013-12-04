exports.listView.events.RENDER_PROGRESS = "listView:renderProgress";
exports.listView.coreAddons.push(function creepRenderModel(exp) {

    var intv = 0,
        percent = 0,
        creepCount = 0,
        creepLimit = 10; // TODO: this needs to read from export.options

    function digest(index) {
        var s = exp.scopes[index];
        if (!s || !s.digested) {// just skip if already digested.
            exp.forceRenderScope(index);
        }
    }

    function onInterval(started, ended) {
        var upIndex = started, downIndex = ended, time = Date.now() + exp.options.renderThreshold;
        while (time > Date.now() && (upIndex > 0 || downIndex < exp.rowsLength)) {
            if (upIndex >= 0) {
                digest(upIndex);
                upIndex -= 1;
            }
            if (downIndex < exp.rowsLength) {
                digest(downIndex);
                downIndex += 1;
            }
        }
        percent = exp.scopes.length / exp.rowsLength;
//        console.log("rendered %s%", Math.round(percent * 100));
        stop();
        creepCount += 1;
        if (!exp.values.speed && exp.scopes.length < exp.rowsLength) {
            resetInterval(upIndex, downIndex);
        }
        exp.dispatch(ux.listView.events.RENDER_PROGRESS, percent);
    }

    function stop() {
        clearTimeout(intv);
        intv = 0;
    }

    function resetInterval(started, ended) {
        stop();
        if (creepCount < creepLimit) {
            intv = setTimeout(onInterval, exp.options.renderThreshold, started, ended);
        }
    }

    function onAfterUpdateWatchers(event, loopData) {
        if (!intv) {
            creepCount = 0;
            resetInterval(loopData.started, loopData.ended);
        }
    }

    exp.unwatchers.push(exp.scope.$on(ux.listView.events.BEFORE_UPDATE_WATCHERS, stop));
    exp.unwatchers.push(exp.scope.$on(ux.listView.events.AFTER_UPDATE_WATCHERS, onAfterUpdateWatchers));
});