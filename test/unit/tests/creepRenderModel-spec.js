describe("creepRenderModel", function () {

    var exp;

    beforeEach(function () {
        var invoke = angular.injector(['ng','ux']).invoke;
        invoke(function ($rootScope) {
            exp = {
                scope: $rootScope.$new(),
                getScope: function (index) {
                    return this.scopes[index];
                },
                scopes: [{}, {}, {}, {}, {}],
                rowsLength: 5,
                flow: new ux.datagrid.Flow({async: false}),
                unwatchers: [],
                options: {
                    creepRender: {enable: true},
                    renderThreshold: 100,
                    creepLimit: 1
                },
                values: {
                    scroll: 0,
                    speed: 0,
                    absSpeed: 0,
                    scrollingStopIntv: null,
                    activeRange: {min: 0, max: 0}
                },
                forceRendered: {},
                forceRenderScope: function (index) {
                    this.forceRendered[index] = true;
                },
                afterUpdateWatchers: function (started, ended) {
                    exp.scope.$emit(ux.datagrid.events.ON_AFTER_UPDATE_WATCHERS, {started: started, ended: ended}, true);
                },
                isCompiled: function () {
                    return true;
                },
                dispatch: function () {}
            };
            ux.datagrid.coreAddons.creepRenderModel(exp);
            exp.flow.run();
        });
    });

    it("should start after update watchers", function () {
        var started = false;
        exp.forceRenderScope = function () {
            started = true;
        };
        exp.afterUpdateWatchers(2, 2);
        expect(started).toBe(true);
    });

    it("should update indexes the before startIndex", function() {
        exp.afterUpdateWatchers(2, 2);
        expect(exp.forceRendered[0]).toBe(true);
    });

    it("should update the indexes after endIndex", function() {
        exp.afterUpdateWatchers(2, 2);
        expect(exp.forceRendered[exp.rowsLength - 1]).toBe(true);
    });
});