/**
 * ux.datagrid is a highly performant scrolling list for desktop and mobile devices.
 */
var module;
try {
    module = angular.module('ux', ['ng']);
} catch (e) {
    module = angular.module('ux');
}

exports.datagrid = {
    isIOS: navigator.userAgent.match(/(iPad|iPhone|iPod)/g),
    states: {
        BUILDING: 'datagrid:building',
        APPENDING: 'datagrid:appending',//TODO: deprecated.
        READY: 'datagrid:ready'
    },
    events: {
        INIT: 'datagrid:init',
        RESIZE: 'datagrid:resize',
        READY: 'datagrid:ready',
        BEFORE_RENDER: 'datagrid:beforeRender',
        AFTER_RENDER: 'datagrid:afterRender',
        LISTENERS_READY: 'datagrid:listenersReady',
        BEFORE_UPDATE_WATCHERS: 'datagrid:beforeUpdateWatchers',
        AFTER_UPDATE_WATCHERS: 'datagrid:afterUpdateWatchers',
        BEFORE_DATA_CHANGE: 'datagrid:beforeDataChange',
        AFTER_DATA_CHANGE: 'datagrid:afterDataChange',
        BEFORE_RENDER_AFTER_DATA_CHANGE: 'datagrid:beforeRenderAfterDataChange',
        RENDER_AFTER_DATA_CHANGE: 'datagrid:renderAfterDataChange',
        ON_ROW_TEMPLATE_CHANGE: 'datagrid:onRowTemplateChange',
        ON_SCROLL: 'datagrid:onScroll'
    },
    options: {
        async: true,
        compileAllRowsOnInit: false,// this can cause it to take a long time to initialize.
        updateDelay: 100, // if < 100ms this fires too often.
        cushion: -50,// debugging cushion about what is deactivated.
        chunkSize: 50,
        uncompiledClass: 'uncompiled',
        dynamicRowHeights: false,//true,
        renderThreshold: 25,
        creepLimit: 50,
        chunkClass: 'ux-datagrid-chunk'
        //TODO: need to create global addons object.
    },
    coreAddons: []
};