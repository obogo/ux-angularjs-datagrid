exports.logWrapper = function LogWrapper(name, instance, theme, dispatch) {
    theme = theme || 'black';
    dispatch = dispatch || instance.dispatch || function () {};
    instance.$logName = name;
    instance.log = instance.info = instance.warn = instance.error = function () {};
    instance.log = function log() {
        var args = [exports.datagrid.events.LOG, name, theme].concat(exports.util.array.toArray(arguments));
        dispatch.apply(instance, args);
    };
    instance.info = function info() {
        var args = [exports.datagrid.events.INFO, name, theme].concat(exports.util.array.toArray(arguments));
        dispatch.apply(instance, args);
    };
    instance.warn = function warn() {
        var args = [exports.datagrid.events.WARN, name, theme].concat(exports.util.array.toArray(arguments));
        dispatch.apply(instance, args);
    };
    instance.error = function error() {
        var args = [exports.datagrid.events.ERROR, name, theme].concat(exports.util.array.toArray(arguments));
        dispatch.apply(instance, args);
    };
    instance.destroyLogger = function () {
       if (instance.logger) {
           instance.log('destroy');
           instance.logger.destroy();
           instance.logger = null;
       }
    };
    return instance;
};