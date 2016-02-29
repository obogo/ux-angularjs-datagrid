define('dg.api', ['isMatch', 'apply', 'toArray', 'sort', 'dispatcher', 'matchAll'], function (isMatch, apply, toArray, sort, dispatcher, matchAll) {
    exports.isMatch = isMatch;
    exports.apply = apply;
    exports.dispatcher = dispatcher;
    exports.matchAll = matchAll;
    exports.array = {toArray: toArray, sort: sort};
});