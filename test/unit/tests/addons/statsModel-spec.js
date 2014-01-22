describe("statsModel", function () {

    var scope, element, grid,
        template = '<div data-ux-datagrid="items" class="datagrid" data-options="{chunkSize:10, async:false}" style="width:100px;height:400px;overflow-y:scroll;" data-addons="statsModel">' +
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
            grid = scope.datagrid;
        });
    });

    afterEach(function () {
        element.remove();
    });

    it("should track how long the datagrid takes to startup", function() {
        expect(grid.stats.initialRenderTime).toBeGreaterThan(0);
    });

    it("should keep an average of the renders", function() {
        expect(grid.stats.averageRenderTime).toBeGreaterThan(0);
    });

    it("should keep the time of the last render", function() {
        expect(grid.stats.lastRenderTime).toBeGreaterThan(0);
    });

    it("should keep track of how many renders have been done.", function() {
        expect(grid.stats.renders).toBe(2);// there is an initial render.
    });

});