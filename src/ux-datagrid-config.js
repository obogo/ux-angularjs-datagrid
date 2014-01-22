//## Home ##
// [ux-angularjs-datagrid(https://github.com/webux/ux-angularjs-datagrid)]

// ## Configs ##
// ux.datagrid is a highly performant scrolling list for desktop and mobile devices that leverages
// the browsers ability to gpu cache the dom structure with fast startup times and optimized rendering
// that allows the gpu to maintain its snapshots as long as possible.
//
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
//      <div ux-datagrid="mylist"
//          options="{debug:{all:1, Flow:0}}">...</div>
//
// These options are then available to other addons to configure them.
exports.datagrid = {
    // ###<a name="isIOS">isIOS</a>###
    // iOS does not natively support smooth scrolling without a css attribute. `-webkit-overflow-scrolling: touch`
    // however with this attribute iOS would crash if you try to change the scroll with javascript, or turn it on and off.
    // So a [virtualScroll(#virtualScroll)] was implemented for iOS to make it scroll using translate3d.
    isIOS: navigator.userAgent.match(/(iPad|iPhone|iPod)/g),
    // the **states** of the datagrid.
    //  - **<a name="states.BUILDING">BUILDING</a>**: is the startup phase of the grid before it is ready to perform the first render. This may include
    // waiting for the dom heights be available.
    //  - **<a name="states.ON_READY">ON_READY</a>**: this means that the grid is ready for rendering.
    states: {
        BUILDING: 'datagrid:building',
        ON_READY: 'datagrid:ready'
    },
    // ###<a name="events">events</a>###
    // These events are reactive events for when the datagrid does something.
    // - **<a name="events.ON_INIT">ON_INIT</a>** when the datagrid has added the addons and is now starting.
    // - **<a name="events.ON_LISTENERS_READY">ON_LISTENERS_READY</a>** Datagrid is now listening. Feel free to fire your events that direct it's behavior.
    // - **<a name="events.ON_READY">ON_READY</a>** the datagrid is all setup with templates, viewHeight, and data and is ready to render.
    // - **<a name="events.ON_BEFORE_RENDER">ON_BEFORE_RENDER</a>** the datagrid is just about to add needed chunks, perform compiling of uncompiled rows, and update and digest the active scopes.
    // - **<a name="events.ON_AFTER_RENDER">ON_AFTER_RENDER</a>** chunked dome was added if needed, active rows are compiled, and active scopes are digested.
    // - **<a name="events.ON_BEFORE_UPDATE_WATCHERS">ON_BEFORE_UPDATE_WATCHERS</a>** Before the active set of watchers is changed.
    // - **<a name="events.ON_AFTER_UPDATE_WATCHERS">ON_AFTER_UPDATE_WATCHERS</a>** After the active set of watchers is changed and digested and activeRange is updated.
    // - **<a name="events.ON_BEFORE_DATA_CHANGE">ON_BEFORE_DATA_CHANGE</a>** A data change watcher has fired. The change has not happened yet.
    // - **<a name="events.ON_BEFORE_RENDER_AFTER_DATA_CHANGE">ON_BEFORE_RENDER_AFTER_DATA_CHANGE</a>** When ever a data change is fired. Just before the render happens.
    // - **<a name="events.ON_RENDER_AFTER_DATA_CHANGE">ON_RENDER_AFTER_DATA_CHANGE</a>** When a render finishes and a data change was what caused it.
    // - **<a name="events.ON_ROW_TEMPLATE_CHANGE">ON_ROW_TEMPLATE_CHANGE</a>** When we change the template that is matched with the row.
    // - **<a name="events.ON_SCROLL">ON_SCROLL</a>** When a scroll change is captured by the datagrid.
    // - **<a name="events.ON_RESET">ON_RESET</a>** When the datagrid is going to clear all dom and rebuild.
    events: {
        ON_INIT: 'datagrid:init',
        ON_LISTENERS_READY: 'datagrid:listenersReady',
        ON_READY: 'datagrid:ready',
        ON_BEFORE_RENDER: 'datagrid:beforeRender',
        ON_AFTER_RENDER: 'datagrid:afterRender',
        ON_BEFORE_UPDATE_WATCHERS: 'datagrid:beforeUpdateWatchers',
        ON_AFTER_UPDATE_WATCHERS: 'datagrid:afterUpdateWatchers',
        ON_BEFORE_DATA_CHANGE: 'datagrid:beforeDataChange',
        ON_AFTER_DATA_CHANGE: 'datagrid:afterDataChange',
        ON_BEFORE_RENDER_AFTER_DATA_CHANGE: 'datagrid:beforeRenderAfterDataChange',
        ON_RENDER_AFTER_DATA_CHANGE: 'datagrid:renderAfterDataChange',
        ON_ROW_TEMPLATE_CHANGE: 'datagrid:onRowTemplateChange',
        ON_SCROLL: 'datagrid:onScroll',
        ON_RESET: 'datagrid:onReset',
        // ##### Driving Events #####
        // These events are used to control the datagrid.
        // - **<a name="events.RESIZE">RESIZE</a>** tells the datagrid to resize. This will update all height calculations.
        // - **<a name="events.UPDATE">UPDATE</a>** force the datagrid to re-evaluate the data and render.
        // - **<a name="events.SCROLL_TO_INDEX">SCROLL_TO_INDEX</a>** scroll the item at that index to the top.
        // - **<a name="events.SCROLL_TO_ITEM">SCROLL_TO_ITEM</a>** scroll that item to the top.
        // - **<a name="events.SCROLL_INTO_VIEW">SCROLL_INTO_VIEW</a>** if the item is above the scroll area, scroll it to the top. If is is below scroll it to the bottom. If it is in the middle, do nothing.
        RESIZE: 'datagrid:resize',
        UPDATE: 'datagrid:update',
        SCROLL_TO_INDEX: 'datagrid:scrollToIndex',
        SCROLL_TO_ITEM: 'datagrid:scrollToItem',
        SCROLL_INTO_VIEW: 'datagrid:scrollIntoView',
        // ##### Log Events #####
        // - **<a name="events.LOG">LOG</a>** An event to be picked up if the gridLogger is added to the addons or any other listener for logging.
        // - **<a name="events.INFO">INFO</a>** An event to be picked up if the gridLogger is added to the addons or any other listener for logging.
        // - **<a name="events.WARN">WARN</a>** An event to be picked up if the gridLogger is added to the addons or any other listener for logging.
        // - **<a name="events.ERROR">ERROR</a>** An event to be picked up if the gridLogger is added to the addons or any other listener for logging.
        LOG: 'datagrid:log',
        INFO: 'datagrid:info',
        WARN: 'datagrid:warn',
        ERROR: 'datagrid:error'
    },
    // ###<a name="options">options</a>###
    // - **<a name="options.asyc">async</a>** this changes the flow manager into not allowing async actions to allow unti tests to perform synchronously.
    // - **<a name="options.updateDelay">updateDelay</a>** used by the scrollModel so that it gives cushion after the grid has stopped scrolling before rendering.
    // while faster times on this make it render faster, it can cause it to rencer multiple times because the scrollbar is not completely stopped and may decrease
    // scrolling performance.
    // - **<a name="options.cushion">cushion</a>** this it used by the updateRowWatchers and what rows it will update. It can be handy for debugging to make sure only
    // the correct rows are digesting by making the value positive it will take off space from the top and bottom of the viewport that number of pixels to match what
    // rows are activated and which ones are not. Also a negative number will cause the grid to render past the viewable area and digest rows that are out of view.
    // - **<a name="options.uncompiledClass">uncompiledClass</a>** before a dom row is rendered it is compiled. The compiled row will have {{}} still in the code
    // because the row has not been digested yet. If the user scrolls they can see this. So the uncompiledClass is used to allow the css to hide rows that are not
    // yet compiled. Once they are compiled and digested the uncompiledClass will be removed from that dom row.
    // - **<a name="options.renderThreshold">renderThreshold</a>** this value is used by the creepRenderModel to allow the render to process for this amount of ms in
    // both directions from the current visible area and then it will wait and process again as many rows as it can in this timeframe.
    // - **<a name="options.renderThresholdWait">renderThresholdWait</a>** used in conjunction with options.renderThreshold this will wait this amount of time before
    // trying to render more rows.
    // - **<a name="options.creepLimit">creepLimit</a>** used with options.renderThreshold and options.renderThresholdWait this will give a maximum amount of renders
    // that can be done before the creep render is turned off.
    // - **<a name="options.chunkClass">chunkClass</a>** the class assigned to each chunk in the datagrid. This can be customized on a per grid basis since options
    // can be overridden so that styles or selection may differ from one grid to the next.
    options: {
        async: true,
        updateDelay: 500, // if < 100ms this fires too often.
        cushion: -50,// debugging cushion about what is deactivated.
        chunkSize: 50,
        uncompiledClass: 'uncompiled',
        renderThreshold: 10,
        renderThresholdWait: 50,
        creepLimit: 100,
        chunkClass: 'ux-datagrid-chunk'
        //TODO: need to create global addons object.
    },
    // ###<a name="coreAddons">coreAddons</a>###
    // the core addons are the ones that are built into the angular-ux-datagrid. This array is used when the grid starts up
    // to add all of these addons before optional addons are added. You can add core addons to the datagrid by adding these directly to this array, however it is not
    // recommended.
    coreAddons: []
};