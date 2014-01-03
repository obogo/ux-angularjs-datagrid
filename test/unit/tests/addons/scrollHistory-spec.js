describe("scrollHistory", function () {

    var sh, scope, exp, shFactory;

    beforeEach(function () {
        var injector = angular.injector(['ngMock', 'ng', 'ux']);
        injector.invoke(function ($location, $rootScope, scrollHistory) {
            scope = $rootScope.$new();
            $location.path = function () {
                return '/myPath';
            };
            scope.items = [];
            for (var i = 0; i < 100; i += 1) {
                scope.items.push({id: i.toString(), name: i.toString(36)});
            }
            shFactory = scrollHistory;
            exp = scrollHistory({
                scope: scope,
                values: {
                    scroll: 0
                },
                options: {},
                unwatchers: [],
                flow: {log: function () {
                }},
                dispatch: function () {
                    scope.$emit.apply(scope, arguments);
                },
                scrollModel: {
                    scrolledTo: 0,
                    scrollTo: function (value) {
                        this.scrolledTo = value;
                    }
                }
            });
            sh = exp.scrollHistory;
        });
    });

    it("should store the value at any path given", function () {
        sh.storeScroll('path', 10);
        expect(sh.getScroll('path')).toBe(10);
    });

    it("should keep the value of the history at the current path", function () {
        exp.values.scroll = 50;
        sh.storeCurrentScroll();
        expect(sh.getCurrentScroll()).toBe(exp.values.scroll);
    });

    it("should update every time the scroll finishes", function () {
        exp.values.scroll = 60;
        exp.dispatch(ux.datagrid.events.RENDER_AFTER_DATA_CHANGE);
        exp.dispatch(ux.datagrid.events.AFTER_UPDATE_WATCHERS);
        expect(sh.getCurrentScroll()).toBe(exp.values.scroll);
    });

    it("should return the value of the previous scroll history", function () {
        sh.storeScroll('path', 10);
        exp = shFactory({
            scope: scope,
            values: {
                scroll: 0
            },
            options: {},
            unwatchers: [],
            flow: {log: function () {
            }},
            dispatch: function () {
                scope.$emit.apply(scope, arguments);
            },
            scrollModel: {
                scrollTo: function () {

                }
            }
        });
        sh = exp.scrollHistory;
        expect(sh.getScroll('path')).toBe(10);
    });

    it("should update the value after the first render if there is a value in the scroll history.", function () {
        sh.storeScroll('/myPath', 10);// needs to be the current path.
        exp.dispatch(ux.datagrid.events.RENDER_AFTER_DATA_CHANGE);
        expect(exp.scrollModel.scrolledTo).toBe(10);
    });
})