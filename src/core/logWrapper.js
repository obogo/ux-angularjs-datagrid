exports.logWrapper = function LogWrapper(name, instance, theme, inst) {
    var apl = exports.util.apply;
    theme = theme || 'black';
    instance.$logName = name;
    instance.log = instance.info = instance.warn = instance.error = function () {};

    function dispatchFn(dispatch, args) {
        if (typeof dispatch === 'function') {
               apl(dispatch, instance, args);
           }
    }

    instance.log = function log() {
        var args = [exports.datagrid.events.LOG, name, theme].concat(exports.util.array.toArray(arguments));
        if (inst.logger) {
            apl(inst.logger.log, inst.logger, args);
        } else {
            dispatchFn(inst, args);
        }
    };
    instance.info = function info() {
        var args = [exports.datagrid.events.INFO, name, theme].concat(exports.util.array.toArray(arguments));
        if (inst.logger) {
            apl(inst.logger.info, inst.logger, args);
        } else {
            dispatchFn(inst, args);
        }
    };
    instance.warn = function warn() {
        var args = [exports.datagrid.events.WARN, name, theme].concat(exports.util.array.toArray(arguments));
        if (inst.logger) {
            apl(inst.logger.warn, inst.logger, args);
        } else {
            dispatchFn(inst, args);
        }
    };
    instance.error = function error() {
        var args = [exports.datagrid.events.ERROR, name, theme].concat(exports.util.array.toArray(arguments));
        if (inst.logger) {
            apl(inst.logger.error, inst.logger, args);
        } else {
            dispatchFn(inst, args);
        }
    };
    instance.destroyLogger = function () {
       if (inst.logger) {
           inst.log('destroy');
           inst.logger.destroy();
           inst.logger = null;
       }
    };
    return instance;
};