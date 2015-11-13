function Flow(inst, dispatch, pauseFn, $timeout) {
    var running = false,
        intv,
        current = null,
        list = [],
        history = [],
        historyLimit = 10,
        uniqueMethods = {},
        execStartTime,
        execEndTime,
        timeouts = {},
        consoleMethodStyle = "color:#666666;";

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
                inst.log("clear duplicate item %c%s", consoleMethodStyle, item.label);
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
        var intv, item = createItem(method, []), startTime = Date.now(),
            timeoutCall = function () {
                inst.log("exec timeout method %c%s %sms", consoleMethodStyle, item.label, Date.now() - startTime);
                list.push(item);// add after timeout time.
                if (running) {
                    next();
                }
            };
        inst.log("wait for timeout method %c%s", consoleMethodStyle, item.label);
        intv = setTimeout(timeoutCall, time);// use regular timeout because we are just waiting to put it in the queue.
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
        inst.log("finish %c%s took %dms", consoleMethodStyle, current.label, execEndTime - execStartTime);
        current = null;
        addToHistory(list.shift());
        if (list.length) {
            next();
        }
        return execEndTime - execStartTime;
    }

    // Keep a history of what methods were executed for debugging. Keep up to the limit.
    function addToHistory(item) {
        history.unshift(item);
        while (history.length > historyLimit) {
            history.pop();
        }
    }

    function next() {
        if (!current && list.length) {
            current = list[0];
            if (inst.async && current.delay !== undefined) {
                inst.log("\tdelay for %c%s %sms", consoleMethodStyle, current.label, current.delay);
                $timeout(exec, current.delay, false);
            } else {
                exec();
            }
        }
    }

    function exec() {
        if (pauseFn && pauseFn()) {
            $timeout(exec, 0, false);
            return;
        }
        inst.log("start method %c%s", consoleMethodStyle, current.label);
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

    function clear() {
        var len = current ? 1 : 0, item;
        inst.log("clear");
        while (list.length > len) {
            item = list.splice(len, 1)[0];
            inst.log("\tremove %s from flow", item.label);
        }
    }

    function length() {
        return list.length;
    }

    function destroy() {
        list.length = 0;
        inst = null;
    }

    inst = exports.logWrapper('Flow', inst || {}, 'grey', dispatch);
//    inst.async = Object.prototype.hasOwnProperty.apply(inst, ['async']) ? inst.async : true;
    inst.debug = Object.prototype.hasOwnProperty.apply(inst, ['debug']) ? inst.debug : 0;
    inst.insert = insert;
    inst.add = add;
    inst.unique = unique;
    inst.remove = remove;
    inst.timeout = timeout;
    inst.stopTimeout = stopTimeout;
    inst.run = run;
    inst.clear = clear;
    inst.length = length;
    inst.destroy = destroy;

    return inst;
}
exports.datagrid.Flow = Flow;