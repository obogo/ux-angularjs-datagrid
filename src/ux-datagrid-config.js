/**
 * ## Configs ##
 * ux.datagrid is a highly performant scrolling list for desktop and mobile devices that leverages
 * the browsers ability to gpu cache the dom structure with fast startup times and optimized rendering
 * that allows the gpu to maintain its snapshots as long as possible.
 *
 * Create the default module of ux if it doesn't already exist.
 */
var module, isIOS = !!navigator.userAgent.match(/(iPad|iPhone|iPod)/g);
try {
    module = angular.module('ux', ['ng']);
} catch (e) {
    module = angular.module('ux');
}
/**
 * Create the datagrid namespace.
 * add the default options for the datagrid. These can be overridden by passing your own options to each
 * instance of the grid. In your HTML templates you can provide the object that will override these settings
 * on a per grid basis.
 *
 *      <div ux-datagrid="mylist"
 *          options="{debug:{all:1, Flow:0}}">...</div>
 *
 * These options are then available to other addons to configure them.
 */
exports.datagrid = {
    /**
     * ###<a name="isIOS">isIOS</a>###
     * iOS does not natively support smooth scrolling without a css attribute. `-webkit-overflow-scrolling: touch`
     * however with this attribute iOS would crash if you try to change the scroll with javascript, or turn it on and off.
     * So a [virtualScroll](#virtualScroll) was implemented for iOS to make it scroll using translate3d.
     */
    isIOS: isIOS,
    /**
     * ###<a name="states">states</a>###
     *  - **<a name="states.BUILDING">BUILDING</a>**: is the startup phase of the grid before it is ready to perform the first render. This may include
     * waiting for the dom heights be available.
     *  - **<a name="states.ON_READY">ON_READY</a>**: this means that the grid is ready for rendering.
     */
    states: {
        BUILDING: 'datagrid:building',
        READY: 'datagrid:ready'
    },
    /**
     * ###<a name="events">events</a>###
     * The events are in three categories based on if they notify of something that happened in the grid then they
     * start with an ON_ or if they are driving the behavior of the datagrid, or they are logging events.
     * #### Notifying Events ####
     * - **<a name="events.ON_INIT">ON_INIT</a>** when the datagrid has added the addons and is now starting.
     * - **<a name="events.ON_LISTENERS_READY">ON_LISTENERS_READY</a>** Datagrid is now listening. Feel free to fire your events that direct it's behavior.
     * - **<a name="events.ON_READY">ON_READY</a>** the datagrid is all setup with templates, viewHeight, and data and is ready to render.
     * - **<a name="events.ON_STARTUP_COMPLETE">ON_STARTUP_COMPLETE</a>** when the datagrid has finished its first render.
     * - **<a name="events.ON_BEFORE_RENDER">ON_BEFORE_RENDER</a>** the datagrid is just about to add needed chunks, perform compiling of uncompiled rows, and update and digest the active scopes.
     * - **<a name="events.ON_AFTER_RENDER">ON_AFTER_RENDER</a>** chunked dome was added if needed, active rows are compiled, and active scopes are digested.
     * - **<a name="events.ON_BEFORE_UPDATE_WATCHERS">ON_BEFORE_UPDATE_WATCHERS</a>** Before the active set of watchers is changed.
     * - **<a name="events.ON_AFTER_UPDATE_WATCHERS">ON_AFTER_UPDATE_WATCHERS</a>** After the active set of watchers is changed and digested and activeRange is updated.
     * - **<a name="events.ON_BEFORE_DATA_CHANGE">ON_BEFORE_DATA_CHANGE</a>** A data change watcher has fired. The change has not happened yet.
     * - **<a name="events.ON_BEFORE_RENDER_AFTER_DATA_CHANGE">ON_BEFORE_RENDER_AFTER_DATA_CHANGE</a>** When ever a data change is fired. Just before the render happens.
     * - **<a name="events.ON_RENDER_AFTER_DATA_CHANGE">ON_RENDER_AFTER_DATA_CHANGE</a>** When a render finishes and a data change was what caused it.
     * - **<a name="events.ON_ROW_TEMPLATE_CHANGE">ON_ROW_TEMPLATE_CHANGE</a>** When we change the template that is matched with the row.
     * - **<a name="events.ON_SCROLL">ON_SCROLL</a>** When a scroll change is captured by the datagrid.
     * - **<a name="events.ON_BEFORE_RESET">ON_BEFORE_RESET</a>** Before the dom is reset this event is fired. Every addon should listen to this event and clean up any listeners
     * that are necessary when this happens so the dom can be cleaned up for the reset.
     * - **<a name="events.ON_AFTER_RESET">ON_AFTER_RESET</a>** After the reset the listeners from the addon can be put back on allowing the reset data to have been completely cleared.
     */
    events: {
        ON_INIT: 'datagrid:onInit',
        ON_LISTENERS_READY: 'datagrid:onListenersReady',
        ON_READY: 'datagrid:onReady',
        ON_STARTUP_COMPLETE: 'datagrid:onStartupComplete',
        ON_BEFORE_RENDER: 'datagrid:onBeforeRender',
        ON_AFTER_RENDER: 'datagrid:onAfterRender',
        ON_BEFORE_UPDATE_WATCHERS: 'datagrid:onBeforeUpdateWatchers',
        ON_AFTER_UPDATE_WATCHERS: 'datagrid:onAfterUpdateWatchers',
        ON_BEFORE_DATA_CHANGE: 'datagrid:onBeforeDataChange',
        ON_AFTER_DATA_CHANGE: 'datagrid:onAfterDataChange',
        ON_BEFORE_RENDER_AFTER_DATA_CHANGE: 'datagrid:onBeforeRenderAfterDataChange',
        ON_RENDER_AFTER_DATA_CHANGE: 'datagrid:onRenderAfterDataChange',
        ON_ROW_TEMPLATE_CHANGE: 'datagrid:onRowTemplateChange',
        ON_SCROLL: 'datagrid:onScroll',
        ON_BEFORE_RESET: 'datagrid:onBeforeReset',
        ON_AFTER_RESET: 'datagrid:onAfterReset',
        ON_AFTER_HEIGHTS_UPDATED: 'datagrid:onAfterHeightsUpdated',
        ON_AFTER_HEIGHTS_UPDATED_RENDER: 'datagrid:onAfterHeightsUpdatedRender',
        ON_BEFORE_ROW_DEACTIVATE: 'datagrid:onBeforeRowDeactivate', // handy for knowing when to remove jquery listeners.
        ON_AFTER_ROW_ACTIVATE: 'datagrid:onAFterRowActivate', // handy for turning jquery listeners back on.
        ON_ROW_COMPILE: 'datagrid:onRowCompile',
        /**
         * #### Driving Events ####
         * - **<a name="events.RESIZE">RESIZE</a>** tells the datagrid to resize. This will update all height calculations.
         * - **<a name="events.UPDATE">UPDATE</a>** force the datagrid to re-evaluate the data and render.
         * - **<a name="events.SCROLL_TO_INDEX">SCROLL_TO_INDEX</a>** scroll the item at that index to the top.
         * - **<a name="events.SCROLL_TO_ITEM">SCROLL_TO_ITEM</a>** scroll that item to the top.
         * - **<a name="events.SCROLL_INTO_VIEW">SCROLL_INTO_VIEW</a>** if the item is above the scroll area, scroll it to the top. If is is below scroll it to the bottom. If it is in the middle, do nothing.
         */
        RESIZE: 'datagrid:resize',
        UPDATE: 'datagrid:update',
        SCROLL_TO_INDEX: 'datagrid:scrollToIndex',
        SCROLL_TO_ITEM: 'datagrid:scrollToItem',
        SCROLL_INTO_VIEW: 'datagrid:scrollIntoView',
        /**
         * #### Log Events ####
         * - **<a name="events.LOG">LOG</a>** An event to be picked up if the gridLogger is added to the addons or any other listener for logging.
         * - **<a name="events.INFO">INFO</a>** An event to be picked up if the gridLogger is added to the addons or any other listener for logging.
         * - **<a name="events.WARN">WARN</a>** An event to be picked up if the gridLogger is added to the addons or any other listener for logging.
         * - **<a name="events.ERROR">ERROR</a>** An event to be picked up if the gridLogger is added to the addons or any other listener for logging.
         */
        LOG: 'datagrid:log',
        INFO: 'datagrid:info',
        WARN: 'datagrid:warn',
        ERROR: 'datagrid:error'
    },
    /**
     * ###<a name="options">options</a>###
     */
    options: {
        // - **<a name="options.asyc">async</a>** this changes the flow manager into not allowing async actions to allow unti tests to perform synchronously.
        async: true,
        // - **<a name="options.updateDelay">updateDelay</a>** used by the scrollModel so that it gives cushion after the grid has stopped scrolling before rendering.
        // while faster times on this make it render faster, it can cause it to rencer multiple times because the scrollbar is not completely stopped and may decrease
        // scrolling performance. if < 100ms this fires too often.
        updateDelay: 100,
        // - **<a name="options.creepRender.enable">creepRender.enable</a>** allow the rendering after the scrolling has stopped to creep in both directions away from the
        // visible area. This can affect performance in a couple of ways. It will make it so more rows are rendered so scrolling will not have to wait for them, however if
        // the device is slower this may affect performance in scrolling because the render has to finish before the touch events will work causing a delay in reaction to
        // touch events.
        creepRender: {
            enable: true
        },
        // - **<a name="creepStartDelay">creepStartDelay</a>**
        // when the creep render starts. How long after the scrolling has stopped.
        creepStartDelay: 1000,
        // - **<a name="options.cushion">cushion</a>** this it used by the updateRowWatchers and what rows it will update. It can be handy for debugging to make sure only
        // the correct rows are digesting by making the value positive it will take off space from the top and bottom of the viewport that number of pixels to match what
        // rows are activated and which ones are not. Also a negative number will cause the grid to render past the viewable area and digest rows that are out of view.
        // In short it is a debugging cushion about what is activated to see them working.
        cushion: -100,
        chunks: {
            // - **<a name="options.chunks.detachDom">chunks.detachDom</a>** this is used when you want the chunks to be absolute positioned and
            // chunks that are out of view are hidden to minimize the gpu snapshot. Values are numbers or boolean.
            // 100 will 100 rows above and below the viewport area. A true will evaluate to 0 above and below. A 0 will equate to false and not do a detach.
            // So the value must be true or a whole number to enable it.
            detachDom: null,
            // - **<a name="options.chunks.size">chunks.size</a>** this is used to determine how large each chunk should be. Chunks are made recursively
            // so if you pass 8 items and they are chunked at 2 then you would have 2 chunks each with 2 chunks each with 2 rows.
            size: 50,
            // - **<a name="options.chunks.chunkClass">chunks.chunkClass</a>** the class assigned to each chunk in the datagrid. This can be customized on a per grid basis since options
            // can be overridden so that styles or selection may differ from one grid to the next.
            chunkClass: 'datagrid-chunk',
            // - **<a name="options.chunks.chunkDisabledClass">chunkDisabledClass</a>**
            // a css class that is added to dom elements that are not containing visible rows.
            chunkDisabledClass: 'datagrid-chunk-disabled',
            // - **<a name="options.chunks.chunkReadyClass">chunks.chunkReadyClass</a>** after the chunk is added. The chunk ready class is added to all for css
            // transitions on newly created chunks.
            chunkReadyClass: 'datagrid-chunk-ready'
        },
        scrollModel: {
            // - **<a name="options.scrollModel.speed">scrollModel.speed</a>** the factor of speed multiplication when determining how far the scroller should coast in manual mode.
            speed: 5,
            // - **<a name="options.scrollModel.manual">scrollModel.manual</a>** if set to true then touch move events will be used to scroll and calculate coasting.
            manual: false,
            // - **<a name="options.scrollModel.simulateClick">scrollModel.simulateClick</a>** defaulted to true for android, and false for iOS.
            simulateClick: !isIOS
        },
        // - **<a name="options.compiledClass">compiledClass</a>** after a row has been compiled the uncompiled class is removed and compiled is added.
        compiledClass: 'compiled',
        // - **<a name="options.uncompiledClass">uncompiledClass</a>** before a dom row is rendered it is compiled. The compiled row will have {{}} still in the code
        // because the row has not been digested yet. If the user scrolls they can see this. So the uncompiledClass is used to allow the css to hide rows that are not
        // yet compiled. Once they are compiled and digested the uncompiledClass will be removed from that dom row.
        uncompiledClass: 'uncompiled',
        // - **<a name="contentClass">contentClass</a>** the name of the css class assigned to the content div.
        contentClass: 'datagrid-content',
        // - **<a name="rowClass">rowClass</a>** the css class assigned to every row.
        rowClass: 'datagrid-row',
        // - **<a name="options.renderThreshold">renderThreshold</a>** this value is used by the creepRenderModel to allow the render to process for this amount of ms in
        // both directions from the current visible area and then it will wait and process again as many rows as it can in this timeframe.
        renderThreshold: 1,
        // - **<a name="options.renderThresholdWait">renderThresholdWait</a>** used in conjunction with options.renderThreshold this will wait this amount of time before
        // trying to render more rows.
        renderThresholdWait: 50,
        // - **<a name="options.renderWhileScrolling">renderWhileScrolling</a>** cause the grid to render while scrolling. This can will drastically reduce scrolling performance.
        // this can be optimized by setting a number of milliseconds between each render while scrolling.
        renderWhileScrolling: false,
        // - **<a name="options.creepLimit">creepLimit</a>** used with options.renderThreshold and options.renderThresholdWait this will give a maximum amount of renders
        // that can be done before the creep render is turned off.
        creepLimit: 500,
        // - **<a name="options.smartUpdate">smartUpdate</a>** when this is enabled if the array changes the order of things but not the templates that they render in then
        // this will not do a normal reset, but will just re-render the visible area with the changes and as you scroll the changes will update.
        smartUpdate: true
        //TODO: need to create global addons object.
    },
    /**
     * ###<a name="coreAddons">coreAddons</a>###
     * the core addons are the ones that are built into the angular-ux-datagrid. This array is used when the grid starts up
     * to add all of these addons before optional addons are added. You can add core addons to the datagrid by adding these directly to this array, however it is not
     * recommended.
     */
    coreAddons: []
};