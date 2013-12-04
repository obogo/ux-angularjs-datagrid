function Flow() {
    var exports = {},
        running = false,
        intv,
        current = null,
        list = [],
        uniqueMethods = {},
        execStartTime,
        execEndTime,
        consoleMethodStyle = "font-weight: bold;color:#3399FF;";

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
                exports.log("flow:clear duplicate item %c%s", consoleMethodStyle, item.label);
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
        exports.log("flow:finish %c%s took %dms", consoleMethodStyle, current.label, execEndTime - execStartTime);
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
            if (current.delay !== undefined) {
                exports.log("\tflow:delay for %c%s %sms", consoleMethodStyle, current.label, current.delay);
                clearTimeout(intv);
                intv = setTimeout(exec, current.delay);
            } else {
                exec();
            }
        }
    }

    function exec() {
        exports.log("flow:start method %c%s", consoleMethodStyle, current.label);
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
        exports.log('flow destroyed');
        exports = null;
    }

    exports.insert = insert;
    exports.add = add;
    exports.unique = unique;
    exports.run = run;
    exports.destroy = destroy;
    exports.log = function () {
        console.log.apply(console, arguments);
    };

    return exports;
}