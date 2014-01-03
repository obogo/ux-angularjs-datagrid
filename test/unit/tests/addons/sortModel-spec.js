describe("sortModel", function () {

    var sorter, scope;

    beforeEach(function () {
        var inject = angular.injector(['ng', 'ux']).invoke;
        inject(function ($compile, $rootScope, sortModel) {
            scope = $rootScope.$new();
            scope.items = [];
            for (var i = 0; i < 100; i += 1) {
                scope.items.push({id: i.toString(), name: i.toString(36)});
            }
            var exp =
                sortModel({
                    scope: scope,
                    options: {
                        sorts: {name: 'asc'}
                    },
                    flow: {info: function () {}},
                    dispatch: function () {
                        scope.$emit.apply(scope, arguments);
                    }
                });
            sorter = exp.sortModel;
        });
    });

    it("should sort the data asc by name", function () {
        var result = sorter.applySorts(scope.items);
        expect(result[0].name).toBe('0');
        expect(result[15].name).toBe('1d');
//        console.log(JSON.stringify(result));
    });

    it("should sort the data desc by name", function () {
        var result = sorter.applySorts(scope.items, {name:'desc'});
        expect(result[0].name).toBe('z');
        expect(result[15].name).toBe('k');
//        console.log(JSON.stringify(result));
    });

    it("should return the normal sort after a sort has been added and removed.", function () {
        sorter.applySorts(scope.items, {name:'desc'});
        var result = sorter.applySorts(scope.items, {name: 'none'});
        expect(result[0].name).toBe(scope.items[0].name);
        expect(result[15].name).toBe(scope.items[15].name);
    });

    it("getSortStateOf should tell what sort state that name is in", function () {
        sorter.applySorts(scope.items, {name:'desc'});
        expect(sorter.getSortStateOf('name')).toBe('desc');
    });

    it("toggleSort should take asc to desc", function () {
        sorter.toggleSort('name');
        expect(sorter.getSortStateOf('name')).toBe('desc');
    });

    it("toggleSort should take desc to none", function () {
        sorter.toggleSort('name');
        sorter.toggleSort('name');
        expect(sorter.getSortStateOf('name')).toBe('none');
    });

    it("toggleSort should take none to asc", function () {
        sorter.toggleSort('name');
        sorter.toggleSort('name');
        sorter.toggleSort('name');
        expect(sorter.getSortStateOf('name')).toBe('asc');
    });

    it("should wait for the sort to be applied for an async sort", function (done) {
        scope.$on(ux.datagrid.events.BEFORE_SORT, function (event, key) {
            sorter.setCache(key, []);
            setTimeout(function () {
                var list = [{name:'a-0'},{name:'a-1'},{name:'a-2'}];
                sorter.setCache(key, list);
                expect(sorter.getCache(key)).toBe(list);
                done();
            });
        });
        sorter.applySorts(scope.items, {name: 'desc'});
    });
});