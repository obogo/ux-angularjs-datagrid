function Flow(exp) {
    var running = false,
        intv,
        current = null,
        list = [],
        uniqueMethods = {},
        execStartTime,
        execEndTime,
        timeouts = {},
        flowStyle = "color: #999999;",
        consoleMethodStyle = "color:#009900;",
        consoleInfoMethodStyle = "font-weight: bold;color:#3399FF;";

    function getMethodName(method) {
        // TODO: there might be a faster way to get the function name.
        return method.toString().split(/\b/)[2];
    }

    function createItem(method, args, delay) {
        return {label: getMethodName(method), method: method, args: args || [], delay: delay};
    }

    function unique(method) {
        var name = getMethodName(method);
        uniqueMethods[name] = method;
    }

    function clearSimilarItemsFromList(item) {
        var i = 0, len = list.length;
        while (i < len) {
            if (list[i].label === item.label && list[i] !== current) {
                exp.info("%cflow:clear duplicate item %c%s", flowStyle, consoleMethodStyle, item.label);
                list.splice(i, 1);
                i -= 1;
                len -= 1;
            }
            i += 1;
        }
    }

    function add(method, args, delay) {
        var item = createItem(method, args, delay), index = -1;
        if (uniqueMethods[item.label]) {
            clearSimilarItemsFromList(item);
        }
        list.push(item);
        if (running) {
            next();
        }
    }

    // this puts it right after the one currently running.
    function insert(method, args, delay) {
        list.splice(1, 0, createItem(method, args, delay));
    }

    function remove(method) {
        clearSimilarItemsFromList({label: getMethodName(method)});
    }

    function timeout(method, time) {
        var intv, item = createItem(method, [], time), startTime = Date.now(),
            timeoutCall = function () {
                exp.log("%cflow:exec timeout method %c%s %sms", flowStyle, consoleMethodStyle, item.label, Date.now() - startTime);
                method();
            };
        exp.log("%cflow:wait for timeout method %c%s", flowStyle, consoleMethodStyle, item.label);
        intv = setTimeout(timeoutCall, time);
        timeouts[intv] = function () {
            clearTimeout(intv);
            delete timeouts[intv];
        };
        return intv;
    }

    function stopTimeout(intv) {
        if (timeouts[intv]) timeouts[intv]();
    }

    function getArguments(fn) {
        var str = fn.toString(), match = str.match(/\(.*\)/);
        return match[0].match(/([\$\w])+/gm);
    }

    function hasDoneArg(fn) {
        var args = getArguments(fn);
        return !!(args && args.indexOf('done') !== -1);
    }

    function done() {
        execEndTime = Date.now();
        exp.log("%cflow:finish %c%s took %dms", flowStyle, consoleMethodStyle, current.label, execEndTime - execStartTime);
        current = null;
        list.shift();
        if (list.length) {
            next();
        }
        return execEndTime - execStartTime;
    }

    function next() {
        if (!current && list.length) {
            current = list[0];
            if (exp.async && current.delay !== undefined) {
                exp.log("\t%cflow:delay for %c%s %sms", flowStyle, consoleMethodStyle, current.label, current.delay);
                clearTimeout(intv);
                intv = setTimeout(exec, current.delay);
            } else {
                exec();
            }
        }
    }

    function exec() {
        exp.log("%cflow:start method %c%s", flowStyle, consoleMethodStyle, current.label);
        var methodHasDoneArg = hasDoneArg(current.method);
        if (methodHasDoneArg) current.args.push(done);
        execStartTime = Date.now();
        current.method.apply(null, current.args);
        if (!methodHasDoneArg) done();
    }

    function run() {
        running = true;
        next();
    }

    function destroy() {
        clearTimeout(intv);
        list.length = 0;
        exp = null;
    }

    exp = exp || {};
    exp.async = exp.hasOwnProperty('async') ? exp.async : true;
    exp.debug = exp.hasOwnProperty('debug') ? exp.debug : 0;
    exp.insert = insert;
    exp.add = add;
    exp.unique = unique;
    exp.remove = remove;
    exp.timeout = timeout;
    exp.stopTimeout = stopTimeout;
    exp.run = run;
    exp.destroy = destroy;
    exp.log = function () {
        var args;
        if (exp.debug && exp.debug <= 1) {
            args = ux.util.array.toArray(arguments);
            if (args[0].indexOf('%c') === -1) {
                args[0] = '%c' + args[0];
                args.splice(1, 0, consoleMethodStyle);
            }
            console.log.apply(console, args);
        }
    };
    exp.info = function () {
        var args;
        if (exp.debug && exp.debug <= 2) {
            args = ux.util.array.toArray(arguments);
            args[0] = '%c' + args[0];
            args.splice(1, 0, consoleInfoMethodStyle);
            console.info.apply(console, args);
        }
    };
    exp.warn = function () {
        // output warnings. something is wrong.
        if (window.console && console.warn) {
            console.warn.apply(console, arguments);
        }
    };

    return exp;
}
exports.datagrid.Flow = Flow;