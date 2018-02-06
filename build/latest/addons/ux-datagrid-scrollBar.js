/*!
* ux-angularjs-datagrid v.1.6.10
* (c) 2018, Obogo
* https://github.com/obogo/ux-angularjs-datagrid
* License: MIT.
*/
(function (exports, global) {
if (typeof define === "function" && define.amd) {
  define(exports);
} else if (typeof module !== "undefined" && module.exports) {
  module.exports = exports;
} else {
  global.ux = exports;
}

angular.module("ux").factory("scrollBar", function() {
    return [ "inst", function(inst) {
        var result = exports.logWrapper("scrollBar", {}, "red", inst), unwatch;
        function init() {
            unwatch();
            inst.element.addClass("datagrid-scrollbar");
            if (!exports.css.getSelector(".datagrid-scrollbar")) {
                exports.css.createClass("datagrid-scrollbar", ".datagrid-scrollbar::-webkit-scrollbar", "-webkit-appearance: none;" + // you need to tweak this to make it available..
                "width: 4px;");
                exports.css.createClass("datagrid-scrollbar", ".datagrid-scrollbar::-webkit-scrollbar-thumb", "border-radius: 4px;" + "background-color: rgba(0,0,0,.5);" + "box-shadow: 0 0 1px rgba(255,255,255,.5);");
            }
        }
        unwatch = inst.scope.$on(exports.datagrid.events.ON_INIT, init);
        inst.scrollBar = result;
    } ];
});
}(this.ux = this.ux || {}, function() {return this;}()));
