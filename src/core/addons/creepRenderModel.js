ux.listView.events.RENDER_PROGRESS = "listView:renderProgress";
ux.listView.coreAddons.push(function creepRenderModel(exports) {

    var intv = 0,
        percent = 0,
        creepCount = 0,
        creepLimit = 10; // TODO: this needs to read from export.options

    function digest(index) {
        var s = exports.scopes[index];
        if (!s || !s.digested) {// just skip if already digested.
            exports.forceRenderScope(index);
        }
    }

    function onInterval(started, ended) {
        var upIndex = started, downIndex = ended, time = Date.now() + exports.options.renderThreshold;
        while (time > Date.now() && (upIndex > 0 || downIndex < exports.rowsLength)) {
            if (upIndex >= 0) {
                digest(upIndex);
                upIndex -= 1;
            }
            if (downIndex < exports.rowsLength) {
                digest(downIndex);
                downIndex += 1;
            }
        }
        percent = exports.scopes.length / exports.rowsLength;
//        console.log("rendered %s%", Math.round(percent * 100));
        stop();
        creepCount += 1;
        if (!exports.values.speed && exports.scopes.length < exports.rowsLength) {
            resetInterval(upIndex, downIndex);
        }
        exports.dispatch(ux.listView.events.RENDER_PROGRESS, percent);
    }

    function stop() {
        clearTimeout(intv);
        intv = 0;
    }

    function resetInterval(started, ended) {
        stop();
        if (creepCount < creepLimit) {
            intv = setTimeout(onInterval, exports.options.renderThreshold, started, ended);
        }
    }

    function onAfterUpdateWatchers(event, loopData) {
        if (!intv) {
            creepCount = 0;
            resetInterval(loopData.started, loopData.ended);
        }
    }

    exports.unwatchers.push(exports.scope.$on(ux.listView.events.BEFORE_UPDATE_WATCHERS, stop));
    exports.unwatchers.push(exports.scope.$on(ux.listView.events.AFTER_UPDATE_WATCHERS, onAfterUpdateWatchers));
});