describe("iosScroll", function () {

    var scope, element, grid,
        template = '<div data-ux-datagrid="items" class="datagrid" data-options="{chunkSize:10, async:false}" style="width:100px;height:400px;overflow-y:scroll;" data-addons="iosScroll">' +
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
            document.body.appendChild(element[0]);
            $compile(element)(scope);
            $rootScope.$digest();
            grid = scope.$$childHead.datagrid;
        });
    });

    afterEach(function() {
        element.remove();
    });

    it("should scroll to the value using scrollTo", function() {
        grid.scrollModel.scrollTo(50, true);
        expect(grid.values.scroll).toBe(50);
    });

    it("should scrollToIndex", function() {
        grid.scrollModel.scrollToIndex(4, true);
        expect(grid.values.scroll).toBe(40);
    });

    it("should scrollToItem", function() {
        grid.scrollModel.scrollToItem(scope.items[4], true);
        expect(grid.values.scroll).toBe(40);
    });

});