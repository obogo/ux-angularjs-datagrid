/**
 * Datagrid stats. A good way to test to see if your plugin is adversly affecting performance.
 * @type {string}
 */
exports.datagrid.events.STATS_UPDATE = 'datagrid:statsUpdate';
angular.module('ux').factory('statsModel', function () {
    return ['inst', function (inst) {
        var initStartTime = 0, rendersTotal = 0, renders = [], unwatchers = [];
        var api = {
            initialRenderTime: 0,
            averageRenderTime: 0,
            lastRenderTime: 0,
            renders: 0
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
            api.lastRenderTime = renders[index];
            rendersTotal += renders[index];
            updateAverage();
        }

        function updateAverage() {
            api.renders = renders.length;
            api.averageRenderTime = rendersTotal / api.renders;
            inst.dispatch(ux.datagrid.events.STATS_UPDATE, api);
        }

        unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_INIT, startInit));
        unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_READY, stopInit));

        inst.unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_BEFORE_UPDATE_WATCHERS, renderStart));
        inst.unwatchers.push(inst.scope.$on(ux.datagrid.events.ON_AFTER_UPDATE_WATCHERS, renderStop));

        inst.stats = api;
    }];
});