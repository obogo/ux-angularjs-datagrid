function Flow(inst, pauseFn, $timeout, dg) {
    var initTime = Date.now(),
        lifespan = 0,
        running = false,
        current = null,
        list = [],
        history = [],
        historyLimit = 10,
        uniqueMethods = {},
        execStartTime,
        execEndTime,
        timeouts = {},
        nextPromise,
        consoleMethodStyle = "color:#666666;",
        infin = 0;

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
        var i = 1, len = list.length;// clearing should never remove the first one, because it is the current one.
        while (i < len) {
            if (list[i].label === item.label) {
                if (list[i] === current && nextPromise) {
                    $timeout.cancel(nextPromise);
                    nextPromise = null;
                    current = null;
                    inst.warn("REMOVE ACTIVE FLOW ITEM %c%s", consoleMethodStyle, item.label);
                } else {
                    inst.info("remove Flow item %c%s", consoleMethodStyle, item.label);
                }
                list.splice(i, 1);
                i -= 1;
                len -= 1;
            }
            i += 1;
        }
        if (!current) {
            // it was cleared. So we now call next.
            next();
        }
    }

    function add(method, args, delay) {
        var item = createItem(method, args, delay);
        inst.info("add", item.label);
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

    // timeouts that do not block the flow.
    function timeout(method, time) {
        var intv, item = createItem(method, []), startTime = Date.now(),
            timeoutCall = function () {
                inst.log("exec timeout method %c%s %sms (len:%s)", consoleMethodStyle, item.label, Date.now() - startTime, list.length);
                list.push(item);// add after timeout time.
                if (running) {
                    next();
                }
            };
        inst.log("wait for timeout method %c%s (len:%s)", consoleMethodStyle, item.label, list.length);
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
        inst.log("\tfinish %c%s took %dms (len:%s)", consoleMethodStyle, current.label, execEndTime - execStartTime, list.length);
        current = null;
        addToHistory(list.shift());
        next();
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
        inst.log("next %s", list.length);
        inst.lifespan = lifespan = Date.now() - initTime;
        if (!current && list.length) {
            infin = 0;
            current = list[0];
            if (inst.async && current.delay !== undefined) {
                inst.log("\tdelay for %c%s %sms (len:%s)", consoleMethodStyle, current.label, current.delay, list.length);
                nextPromise = $timeout(exec, current.delay, false);
            } else {
                exec();
            }
        } else if (current && list.length && current.label === list[0].label) {
            inst.info("\tskip", current.label);
            if (infin > 100) {
                inst.warn("Exceeded max repeat of 100 iterations on the same method. Dropping Method.");
                list.shift();// we are somehow stuck. Throw warning and skip this step
            }
            infin += 1;
        }
    }

    function exec() {
        if (!inst) {
            return;// datagrid was destroyed. ignore async calls.
        }
        if (nextPromise) {
            $timeout.cancel(nextPromise);
        }
        if (pauseFn && pauseFn()) {
            inst.warn("\twait for pauseFn");
            nextPromise = $timeout(exec, 0, false);
            return;
        }
        var methodHasDoneArg = hasDoneArg(current.method);
        inst.log("start method %c%s (len:%s)" + (methodHasDoneArg && " - (has done arg)" || ''), consoleMethodStyle, current.label, list.length);
        if (methodHasDoneArg) {
            current.args.push(done);
        }
        try {
            execStartTime = Date.now();
            exports.util.apply(current.method, null, current.args);
        } catch (e) {
            inst.warn(e.message + "\n" + (e.stack || e.stacktrace || e.backtrace));
        } finally {
            if (!methodHasDoneArg) {
                done();
            }
        }
    }

    function run() {
        running = true;
        next();
    }

    function clear() {
        var len = current ? 1 : 0, item;
        inst.info("clear");
        while (list.length > len) {
            item = list.splice(len, 1)[0];
            inst.log("\tremove %s from flow", item.label);
        }
    }

    function length() {
        return list.length;
    }

    function count(name) {
        var c = 0;
        for(var i = 0; i < list.length; i += 1) {
            if (name instanceof Array && name.indexOf(list[i].label) !== -1 || list[i].label === name) {
                c += 1;
            }
        }
        return c;
    }

    function destroy() {
        list.length = 0;
        inst = null;
    }

    exports.logWrapper('Flow', inst, 'grey', dg || inst);// if no dg. It will not log.
//    inst.async = exports.util.apply(Object.prototype.hasOwnProperty, inst, ['async']) ? inst.async : true;
    inst.debug = exports.util.apply(Object.prototype.hasOwnProperty, inst, ['debug']) ? inst.debug : 0;
    inst.insert = insert;
    inst.add = add;
    inst.unique = unique;
    inst.remove = remove;
    inst.timeout = timeout;
    inst.stopTimeout = stopTimeout;
    inst.run = run;
    inst.clear = clear;
    inst.length = length;
    inst.count = count;
    inst.destroy = destroy;

    return inst;
}
exports.datagrid.Flow = Flow;