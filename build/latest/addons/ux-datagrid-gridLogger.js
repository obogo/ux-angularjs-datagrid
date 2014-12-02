/*
* ux-angularjs-datagrid v.1.1.7
* (c) 2014, WebUX
* https://github.com/webux/ux-angularjs-datagrid
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

angular.module("ux").factory("gridLogger", function() {
    var level = {
        LOG: 1,
        INFO: 2,
        WARN: 3,
        ERROR: 4
    }, methods = [ "log", "info", "warn", "error" ], themes = {
        black: [ "color:#000000", "color:#000000", "color:#000000", "color:#000000" ],
        light: [ "color:#DDDDDD", "color:#BBBBBB", "color:#999999;font-style:italic;font-weight:bold;", "color:#FF0000;font-weight:bold;" ],
        grey: [ "color:#999999", "color:#666666", "color:#333333;font-style:italic;font-weight:bold;", "color:#FF0000;font-weight:bold;" ],
        red: [ "color:#CD9B9B", "color:#CD5C5C", "color:#CC3232;font-style:italic;font-weight:bold;", "color:#FF0000;font-weight:bold;" ],
        green: [ "color:#9CBA7F", "color:#78AB46", "color:#45B000;font-style:italic;font-weight:bold;", "color:#FF0000;font-weight:bold;" ],
        teal: [ "color:#B4CDCD;", "color:#79CDCD;", "color:#37B6CE;font-style:italic;font-weight:bold;", "color:#FF0000;font-weight:bold;" ],
        blue: [ "color:#B9D3EE;", "color:#75A1D0;", "color:#0276FD;font-style:italic;font-weight:bold;", "color:#FF0000;font-weight:bold;" ],
        purple: [ "color:#BDA0CB", "color:#9B30FF", "color:#7D26CD;font-style:italic;font-weight:bold;", "color:#FF0000;font-weight:bold;" ],
        orange: [ "color:#EDCB62", "color:#FFAA00", "color:#FF8800;font-style:italic;font-weight:bold;", "color:#FF0000;font-weight:bold;" ],
        redOrange: [ "color:#FF7640", "color:#FF4900", "color:#BF5930;font-style:italic;font-weight:bold;", "color:#FF0000;font-weight:bold;" ]
    };
    function getArgs(args, dropCount) {
        var ary = exports.util.array.toArray(args);
        if (dropCount) {
            ary.splice(0, dropCount);
        }
        return ary;
    }
    return [ "inst", "$rootScope", function gridLogger(inst, $rootScope) {
        var result = {};
        // listen to events and write them.
        function onLog(event) {
            output(level.LOG, arguments);
        }
        function onInfo(event) {
            output(level.INFO, arguments);
        }
        function onWarn(event) {
            output(level.WARN, arguments);
        }
        function onError(even) {
            output(level.ERROR, arguments);
        }
        function hasPermissionToLog(lvl, name) {
            if (inst.options.debug) {
                if (inst.options.debug.all < lvl || inst.options.debug[name] === 0) {
                    return false;
                } else if (lvl <= inst.options.debug.all) {
                    return true;
                } else if (inst.options.debug[name] <= lvl) {
                    return true;
                }
            }
            return false;
        }
        function output(lvl, args) {
            var logArgs, zl = lvl - 1, event = args[0];
            if (hasPermissionToLog(lvl, args[1])) {
                logArgs = getArgs(arguments[1], 1);
                if (window.console && console[methods[zl]]) {
                    console[methods[zl]].apply(console, result.format(logArgs, lvl, event));
                }
            }
        }
        result.format = function format(args, lvl, event) {
            var name = args.shift(), theme = args.shift() || "grey", i = 0, len = args[0].length, indent = "", char = args[0].charAt(i);
            while (i < len && (char === " " || char === "	")) {
                indent += char;
                i += 1;
                char = args[0].charAt(i);
            }
            args[0] = args[0].substr(indent.length, args[0].length);
            args[0] = indent + "%c" + name + "[" + event.targetScope.$id + "]::" + args[0];
            args.splice(1, 0, (themes[theme] || theme)[lvl - 1]);
            return args;
        };
        result.destroy = function() {
            result = null;
            $rootScope = null;
        };
        inst.unwatchers.push($rootScope.$on(exports.datagrid.events.LOG, onLog));
        inst.unwatchers.push($rootScope.$on(exports.datagrid.events.INFO, onInfo));
        inst.unwatchers.push($rootScope.$on(exports.datagrid.events.WARN, onWarn));
        inst.unwatchers.push($rootScope.$on(exports.datagrid.events.ERROR, onError));
        inst.logger = result;
    } ];
});
}(this.ux = this.ux || {}, function() {return this;}()));
