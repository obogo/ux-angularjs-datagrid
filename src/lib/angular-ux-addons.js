/*global module */
module.factory('addons', ['$injector', function ($injector) {

    function applyAddons(addons, instance) {
        var i = 0, len = addons.length, result;
        while (i < len) {
            result = $injector.get(addons[i]);
            if (typeof result === "function") {
                $injector.invoke(result, instance, {exp:instance, dg:instance});
            } else {
                // they must have returned a null? what was the point. Throw an error.
                throw new Error("Addons expect a function to pass the grid instance to.");
            }
            i += 1;
        }
    }

    return function (instance, addons) {
        addons = addons instanceof Array ? addons : (addons && addons.replace(/,/g, ' ').replace(/\s+/g, ' ').split(' ') || []);
        if (instance.addons) {
            addons = instance.addons = instance.addons.concat(addons);
        }
        applyAddons(addons, instance);
    };
}]);