(function(exports, global) {
    global["hb"] = exports;
    var $$ = exports.$$ || function(name) {
        if (!$$[name]) {
            $$[name] = {};
        }
        return $$[name];
    };
    var cache = $$("c");
    var internals = $$("i");
    var pending = $$("p");
    exports.$$ = $$;
    var toArray = function(args) {
        return Array.prototype.slice.call(args);
    };
    var _ = function(name) {
        var args = toArray(arguments);
        var val = args[1];
        if (typeof val === "function") {
            this.c[name] = val();
        } else {
            cache[name] = args[2];
            cache[name].$inject = val;
            cache[name].$internal = this.i;
        }
    };
    var define = function() {
        _.apply({
            i: false,
            c: exports
        }, toArray(arguments));
    };
    var internal = function() {
        _.apply({
            i: true,
            c: internals
        }, toArray(arguments));
    };
    var resolve = function(name, fn) {
        pending[name] = true;
        var injections = fn.$inject;
        var args = [];
        var injectionName;
        for (var i in injections) {
            if (injections.hasOwnProperty(i)) {
                injectionName = injections[i];
                if (cache[injectionName]) {
                    if (pending.hasOwnProperty(injectionName)) {
                        throw new Error('Cyclical reference: "' + name + '" referencing "' + injectionName + '"');
                    }
                    resolve(injectionName, cache[injectionName]);
                    delete cache[injectionName];
                }
            }
        }
        if (!exports[name] && !internals[name]) {
            for (var n in injections) {
                injectionName = injections[n];
                args.push(exports.hasOwnProperty(injectionName) && exports[injectionName] || internals.hasOwnProperty(injectionName) && internals[injectionName]);
            }
            if (fn.$internal) {
                internals[name] = fn.apply(null, args) || name;
            } else {
                exports[name] = fn.apply(null, args) || name;
            }
        }
        Object.defineProperty(exports, "$$", {
            enumerable: false,
            writable: false
        });
        delete pending[name];
    };
    //! node_modules/hbjs/src/utils/browser/cssRules.js
    define("cssRules", function() {
        function getCSSRule(ruleName, deleteFlag) {
            ruleName = ruleName.toLowerCase();
            var len = document.styleSheets && document.styleSheets.length || 0;
            var styleSheet;
            var ii;
            var i;
            var cssRule;
            if (document.styleSheets) {
                for (i = 0; i < len; i += 1) {
                    styleSheet = document.styleSheets[i];
                    ii = 0;
                    cssRule = false;
                    do {
                        if (styleSheet.cssRules) {
                            cssRule = styleSheet.cssRules[ii];
                        } else if (styleSheet.rules) {
                            cssRule = styleSheet.rules[ii];
                        }
                        if (cssRule) {
                            if (cssRule.selectorText && cssRule.selectorText.toLowerCase() == ruleName) {
                                if (deleteFlag == "delete") {
                                    if (styleSheet.cssRules) {
                                        styleSheet.deleteRule(ii);
                                    } else {
                                        styleSheet.removeRule(ii);
                                    }
                                    return true;
                                } else {
                                    return cssRule;
                                }
                            }
                        }
                        ii++;
                    } while (cssRule);
                }
            }
            return false;
        }
        function removeCSSRule(ruleName) {
            return getCSSRule(ruleName, "delete");
        }
        function addCSSRule(ruleName, style) {
            var lastIndex;
            if (document.styleSheets) {
                if (!getCSSRule(ruleName)) {
                    lastIndex = document.styleSheets.length - 1;
                    if (document.styleSheets[0].addRule) {
                        document.styleSheets[lastIndex].addRule(ruleName, style, 0);
                    } else {
                        document.styleSheets[lastIndex].insertRule(ruleName + " {" + style + " }", 0);
                    }
                }
            }
            return getCSSRule(ruleName);
        }
        return {
            get: getCSSRule,
            add: addCSSRule,
            remove: removeCSSRule
        };
    });
    //! node_modules/hbjs/src/utils/async/throttle.js
    define("throttle", function() {
        var throttle = function(func, threshhold, scope) {
            threshhold = threshhold || 250;
            var last, deferTimer;
            return function() {
                var context = scope || this;
                var now = +new Date(), args = arguments;
                if (last && now < last + threshhold) {
                    clearTimeout(deferTimer);
                    deferTimer = setTimeout(function() {
                        last = now;
                        func.apply(context, args);
                    }, threshhold);
                } else {
                    last = now;
                    func.apply(context, args);
                }
            };
        };
        return throttle;
    });
    //! node_modules/hbjs/src/utils/browser/isElementInViewport.js
    define("isElementInViewport", [], function() {
        function intersectRect(r1, r2) {
            return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
        }
        function inRange(val, min, max) {
            return val >= min && val <= max;
        }
        function isElementInViewport(el) {
            var r, html;
            if (!el || 1 !== el.nodeType) {
                return false;
            }
            html = document.documentElement;
            r = el.getBoundingClientRect();
            return !!r && r.bottom >= 0 && r.right >= 0 && r.top <= html.clientHeight && r.left <= html.clientWidth;
        }
        return isElementInViewport;
    });
    for (var name in cache) {
        resolve(name, cache[name]);
    }
})(this["hb"] || {}, function() {
    return this;
}());