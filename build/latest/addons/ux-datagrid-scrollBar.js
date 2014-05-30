/*
* uxDatagrid v.1.0.0
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
* License: MIT.
*/
(function(exports, global){
angular.module("ux").factory("scrollBar", function() {
    return function(inst) {
        var result = exports.logWrapper("scrollBar", {}, "red", inst.dispatch), scrollBarElm = document.createElement("div"), data = {}, parent = inst.element[0].parentNode, nextSibling = inst.element[0].nextSibling;
        scrollBarElm.style.display = "none";
        scrollBarElm.className = "datagrid-scrollbar";
        if (nextSibling) {
            parent.insertBefore(scrollBarElm, nextSibling);
        } else {
            parent.appendChild(scrollBarElm);
        }
        if (!exports.css.getSelector(".datagrid-scrollbar")) {
            exports.css.createClass("datagrid-scrollbar", ".datagrid-scrollbar", "box-sizing: border-box; " + "position: absolute; " + "top:0px; " + "right:0px; " + "width:6px; " + "background-color: rgba(0, 0, 0, 0.498039); " + "border: 1px solid rgba(255, 255, 255, 0.901961); " + "border-top-left-radius: 3px; " + "border-top-right-radius: 3px; " + "border-bottom-right-radius: 3px; " + "border-bottom-left-radius: 3px; " + "display: block; height: 476px; " + "background-position: initial initial; " + "background-repeat: initial initial;");
            exports.css.createClass("datagrid-scrollbar", ".scrolling", "opacity:1;");
        }
        function calculateDimensions() {
            var vh = inst.getViewportHeight(), ch = inst.getContentHeight(), sp = inst.values.scroll / ch;
            if (vh < ch) {
                data.percentHeight = vh / ch;
                data.display = "block";
                data.height = vh * data.percentHeight;
                data.height = data.height < 10 ? 10 : data.height;
                data.top = inst.element[0].offsetTop + vh * sp;
            } else {
                data.display = "none";
            }
        }
        function updateScrollBar() {
            calculateDimensions();
            scrollBarElm.style.height = data.height + "px";
            scrollBarElm.style.top = data.top + "px";
            scrollBarElm.style.display = data.display;
        }
        function onScrollStart(event, val) {
            scrollBarElm.classList.add("scrolling");
            updateScrollBar();
        }
        function onScrollMove(event, val) {
            updateScrollBar();
        }
        function onScrollEnd(event, values) {
            updateScrollBar();
            scrollBarElm.classList.remove("scrolling");
        }
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_SCROLL_START, onScrollStart));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_SCROLL, onScrollMove));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_SCROLL_STOP, onScrollEnd));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_AFTER_HEIGHTS_UPDATED_RENDER, updateScrollBar));
        inst.unwatchers.push(inst.scope.$on(exports.datagrid.events.ON_STARTUP_COMPLETE, updateScrollBar));
        result.destroy = function() {
            scrollBarElm.remove();
            scrollBarElm = null;
            data = null;
            inst = null;
            result = null;
        };
        inst.scrollBar = result;
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
