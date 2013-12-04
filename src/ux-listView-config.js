var module;
try {
    module = angular.module('ux', ['ng']);
} catch (e) {
    module = angular.module('ux');
}

exports.listView = {
    states: {
        BUILDING: 'lsitView:building',
        APPENDING: 'listView:appending',
        READY: 'listView:ready',
        DEACTIVATED: 'listView:deactivated', // only broadcast from row being deactivated.
        ACTIVATED: 'listView:activated' // only broadcast from row being active.
    },
    events: {
        INIT: 'uxListView:init',
        BUILDING_PROGRESS: 'uxListView:buildingProgress',
        APPENDING_PROGRESS: 'uxListView:appendingProgress',
        READY: 'uxListView:ready',
        BEFORE_UPDATE_WATCHERS: 'uxListView:beforeUpdateWatchers',
        AFTER_UPDATE_WATCHERS: 'uxListView:afterUpdateWatchers',
    },
    options: {
        compileAllRowsOnInit: false,// this can cause it to take a long time to initialize.
        updateDelay: 50,
        cushion: 100,// debugging cushion about what is deactivated.
        chunkSize: 100,
        uncompiledClass: 'uncompiled',
        dynamicRowHeights: false,//true,
        renderThreshold: 50
    },
    coreAddons: []
};