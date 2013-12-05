var module;
try {
    module = angular.module('ux', ['ng']);
} catch (e) {
    module = angular.module('ux');
}

exports.datagrid = {
    states: {
        BUILDING: 'datagrid:building',
        APPENDING: 'datagrid:appending',
        READY: 'datagrid:ready',
        DEACTIVATED: 'datagrid:deactivated', // only broadcast from row being deactivated.
        ACTIVATED: 'datagrid:activated' // only broadcast from row being active.
    },
    events: {
        INIT: 'datagrid:init',
        BUILDING_PROGRESS: 'datagrid:buildingProgress',
        APPENDING_PROGRESS: 'datagrid:appendingProgress',
        READY: 'datagrid:ready',
        BEFORE_UPDATE_WATCHERS: 'datagrid:beforeUpdateWatchers',
        AFTER_UPDATE_WATCHERS: 'datagrid:afterUpdateWatchers',
    },
    options: {
        compileAllRowsOnInit: false,// this can cause it to take a long time to initialize.
        updateDelay: 50,
        cushion: -50,// debugging cushion about what is deactivated.
        chunkSize: 100,
        uncompiledClass: 'uncompiled',
        dynamicRowHeights: false,//true,
        renderThreshold: 50,
        creepLimit: 20
    },
    coreAddons: []
};