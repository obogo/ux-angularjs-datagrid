/**
 * ##dispatcher##
 * Behavior modifier for event dispatching.
 * @param {Object} target - the object to apply the methods to.
 * @param {Object} scope - the object that the methods will be applied from
 * @param {object} map - custom names of what methods to map from scope. such as _$emit_ and _$broadcast_.
 */
function dispatcher(target, scope, map) {
    var listeners = {};

    /**
     * ###off###
     * removeEventListener from this object instance. given the event listened for and the callback reference.
     * @param event
     * @param callback
     */
    function off(event, callback) {
        var index, list;
        list = listeners[event];
        if (list) {
            if (callback) {
                index = list.indexOf(callback);
                if (index !== -1) {
                    list.splice(index, 1);
                }
            } else {
                list.length = 0;
            }
        }
    }

    /**
     * ###on###
     * addEventListener to this object instance.
     * @param {String} event
     * @param {Function} callback
     * @returns {Function} - removeListener or unwatch function.
     */
    function on(event, callback) {
        listeners[event] = listeners[event] || [];
        listeners[event].push(callback);
        return function () {
            off(event, callback);
        };
    }

    /**
     * ###onOnce###
     * addEventListener that gets remove with the first call.
     * @param event
     * @param callback
     * @returns {Function} - removeListener or unwatch function.
     */
    function onOnce(event, callback) {
        function fn() {
            off(event, fn);
            exports.util.apply(callback, scope || target, arguments);
        }
        return on(event, fn);
    }

    /**
     * ###getListeners###
     * get the listeners from the dispatcher.
     * @param {String} event
     * @returns {*}
     */
    function getListeners(event) {
        return listeners[event];
    }

    /**
     * ###fire###
     * fire the callback with arguments.
     * @param {Function} callback
     * @param {Array} args
     * @returns {*}
     */
    function fire(callback, args) {
        return callback && exports.util.apply(callback, target, args);
    }

    /**
     * ###dispatch###
     * fire the event and any arguments that are passed.
     * @param {String} event
     */
    function dispatch(event) {
        if (listeners[event]) {
            var i = 0, list = listeners[event], len = list.length;
            while (i < len) {
                fire(list[i], arguments);
                i += 1;
            }
        }
    }

    if (scope && map) {
        target.on = scope[map.on] && scope[map.on].bind(scope);
        target.off = scope[map.off] && scope[map.off].bind(scope);
        target.onOnce = scope[map.onOnce] && scope[map.onOnce].bind(scope);
        target.dispatch = scope[map.dispatch].bind(scope);
    } else {
        target.on = on;
        target.off = off;
        target.onOnce = onOnce;
        target.dispatch = dispatch;
    }
    target.getListeners = getListeners;
}
exports.dispatcher = dispatcher;
