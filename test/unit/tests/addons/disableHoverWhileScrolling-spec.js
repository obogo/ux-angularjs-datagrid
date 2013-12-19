describe("disableHoverWhileScrolling", function () {

    var scope, element, grid,
        template = '<div data-ux-datagrid="items" class="datagrid" data-options="{chunkSize:10, async:false}" style="width:100px;height:400px;" data-addons="disableHoverWhileScrolling">' +
                        '<script type="template/html" data-template-name="default" data-template-item="item">' +
                            '<div class="mock-row" style="height:10px;">{{item.id}}</div>' +
                        '</script>' +
                    '</div>';
    beforeEach(function () {
        var inject = angular.injector(['ng','ux']).invoke;
        inject(function ($compile, $rootScope) {
            scope = $rootScope.$new();
            scope.items = [];
            for (var i = 0; i < 100; i += 1) {
                scope.items.push({id: i.toString()});
            }
            element = angular.element(template);
            $compile(element)(scope);
            $rootScope.$digest();
            grid = scope.datagrid;
        });
    });

    it("should disable hover while scrolling", function() {
        grid.dispatch(ux.datagrid.events.SCROLL_START, 10);
        expect(element[0].classList[element[0].classList.length - 1]).toBe('disable-hover-while-scrolling');
    });

    it("should re-enable hover when done scrolling", function() {
        grid.dispatch(ux.datagrid.events.SCROLL_START, 10);
        grid.dispatch(ux.datagrid.events.SCROLL_STOP, 10);
        expect(element[0].classList[element[0].classList.length - 1]).not.toBe('disable-hover-while-scrolling');
    });

});