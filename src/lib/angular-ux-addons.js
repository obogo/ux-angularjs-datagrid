/**
 * ###addons###
 * The addons module is used to pass injected names directly to the directive and then have them applied
 * to the instance. Each of the addons is expected to be a factory that takes at least one argument which
 * is the instance being passed to it. They can ask for additional ones as well and they will be injected
 * in from angular's injector.
 */
module.factory('addons', ['$injector', function ($injector) {

    function applyAddons(addons, instance) {
        var i = 0, len = addons.length, result, addon;
        while (i < len) {
            result = $injector.get(addons[i]);
            if (typeof result === "function") {
                // It is expected that each addon be a function. inst is the instance that is injected.
                addon = $injector.invoke(result, instance, {inst:instance});
            } else {
                // they must have returned a null? what was the point. Throw an error.
                throw new Error("Addons expect a function to pass the grid instance to.");
            }
            i += 1;
        }
    }

    return function (instance, addons) {
        // addons can be a single item, array, or comma/space separated string.
        addons = addons instanceof Array ? addons : (addons && addons.replace(/,/g, ' ').replace(/\s+/g, ' ').split(' ') || []);
        if (instance.addons) {
            addons = instance.addons = instance.addons.concat(addons);
        }
        applyAddons(addons, instance);
    };
}]);