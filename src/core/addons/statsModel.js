ux.listView.events.STATS_UPDATE = 'ux-listView:statsUpdate';
ux.listView.coreAddons.push(function statsModel(exports) {
    var initStartTime = 0, rendersTotal = 0, renders = [], unwatchers = [];
    var api = {
        initialRenderTime: 0,
        averageRenderTime: 0
    };

    function startInit() {
        initStartTime = Date.now();
    }

    function stopInit() {
        api.initialRenderTime = Date.now() - initStartTime;
        clearWatchers();
    }

    function clearWatchers() {
        while (unwatchers.length) {
            unwatchers.pop()();
        }
    }

    function renderStart() {
        renders.push(Date.now());
    }

    function renderStop() {
        var index = renders.length - 1;
        renders[index] = Date.now() - renders[index];
        rendersTotal += renders[index];
        updateAverage();
    }

    function updateAverage() {
        api.renders = renders.length;
        api.averageRenderTime = rendersTotal / api.renders;
        exports.dispatch(ux.listView.events.STATS_UPDATE, api);
    }

    unwatchers.push(exports.scope.$on(ux.listView.events.INIT, startInit));
    unwatchers.push(exports.scope.$on(ux.listView.events.READY, stopInit));

    exports.unwatchers.push(exports.scope.$on(ux.listView.events.BEFORE_UPDATE_WATCHERS, renderStart));
    exports.unwatchers.push(exports.scope.$on(ux.listView.events.AFTER_UPDATE_WATCHERS, renderStop));

    exports.stats = api;
});