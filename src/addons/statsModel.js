/**
 * Datagrid stats. A good way to test to see if your plugin is adversly affecting performance.
 * @type {string}
 */
ux.datagrid.events.STATS_UPDATE = 'datagrid:statsUpdate';
angular.module('ux').factory('statsModel', function () {
    return function (exp) {
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
            exp.dispatch(ux.datagrid.events.STATS_UPDATE, api);
        }

        unwatchers.push(exp.scope.$on(ux.datagrid.events.INIT, startInit));
        unwatchers.push(exp.scope.$on(ux.datagrid.events.READY, stopInit));

        exp.unwatchers.push(exp.scope.$on(ux.datagrid.events.BEFORE_UPDATE_WATCHERS, renderStart));
        exp.unwatchers.push(exp.scope.$on(ux.datagrid.events.AFTER_UPDATE_WATCHERS, renderStop));

        exp.stats = api;
    };
});