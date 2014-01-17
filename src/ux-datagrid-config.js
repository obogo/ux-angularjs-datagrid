// ## Configs ##
// ux.datagrid is a highly performant scrolling list for desktop and mobile devices that leverages
// the browsers ability to gpu cache the dom structure with fast startup times and optimized rendering
// that allows the gpu to maintain its snapshots as long as possible.

// Create the default module of ux if it doesn't already exist.
var module;
try {
    module = angular.module('ux', ['ng']);
} catch (e) {
    module = angular.module('ux');
}

// Create the datagrid namespace.
// add the default options for the datagrid. These can be overridden by passing your own options to each
// instance of the grid. In your HTML templates you can provide the object that will override these settings
// on a per grid basis.
//
//      <div ux-datagrid="mylist" options="{debug:{all:1, Flow:0}}">...</div>
//
// These options are then available to other addons to configure them.
exports.datagrid = {
    // **<a name="isIOS">isIOS</a>**
    // iOS does not natively support smooth scrolling without a css attribute. `-webkit-overflow-scrolling: touch`
    // however with this attribute iOS would crash if you try to change the scroll with javascript, or turn it on and off.
    // so a virtual scroll was implemented for iOS to make it scroll using translate3d.
    isIOS: navigator.userAgent.match(/(iPad|iPhone|iPod)/g),
    // the **states** of the application.
    //  - **<a name="states.BUILDING">BUILDING</a>**: is the startup phase of the grid before it is ready to perform the first render. This may include
    // waiting for the dom heights be available.
    //  - **<a name="states.READY">READY</a>**: this means that the grid is ready for rendering.
    states: {
        BUILDING: 'datagrid:building',
        READY: 'datagrid:ready'
    },
    // **<a name="events">Events</a>**
    // - **<a name="events.INIT">INIT</a>** when the datagrid has added the addons and is now starting.
    // - **<a name="events.RESIZE">RESIZE</a>** tells the datagrid to resize. This will update all height calculations.
    // - **<a name="events.READY">READY</a>** the datagrid is all setup with templates, viewHeight, and data and is ready to render.
    // - **<a name="events.BEFORE_RENDER">BEFORE_RENDER</a>** the datagrid is just about to add needed chunks, perform compiling of uncompiled rows, and update and digest the active scopes.
    // - **<a name="events.AFTER_RENDER">AFTER_RENDER</a>** chunked dome was added if needed, active rows are compiled, and active scopes are digested.
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
        ON_SCROLL: 'datagrid:onScroll',
        // for logging.
        LOG: 'datagrid:log',
        INFO: 'datagrid:info',
        WARN: 'datagrid:warn',
        ERROR: 'datagrid:error'
    },
    options: {
        async: true,
        compileAllRowsOnInit: false,// this can cause it to take a long time to initialize.
        updateDelay: 500, // if < 100ms this fires too often.
        cushion: -50,// debugging cushion about what is deactivated.
        chunkSize: 50,
        uncompiledClass: 'uncompiled',
        dynamicRowHeights: false,//true,
        renderThreshold: 10,
        renderThresholdWait: 50,
        creepLimit: 100,
        chunkClass: 'ux-datagrid-chunk'
        //TODO: need to create global addons object.
    },
    coreAddons: []
};