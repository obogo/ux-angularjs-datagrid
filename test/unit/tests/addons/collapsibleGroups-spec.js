describe("collapsibleGroups", function () {

    var scope, element, grid,
        template = '<div data-ux-datagrid="items" class="datagrid" data-grouped="\'children\'" data-options="{chunkSize:10, async:false}" style="width:100px;height:400px;" data-addons="collapsibleGroups">' +
                        '<script type="template/html" data-template-name="group" data-template-item="item">' +
                            '<div class="mock-row" style="height:10px;">{{item.id}}</div>' +
                        '</script>' +
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
                scope.items.push({id: i.toString(), _template:'group', children: [{id:i+'.a'},{id:i+'.b'},{id:i+'.c'}]});
            }
            element = angular.element(template);
            document.body.appendChild(element[0]);
            $compile(element)(scope);
            $rootScope.$digest();
            grid = scope.$$childHead.datagrid;
        });
    });

    afterEach(function () {
        element.remove();
    });

    it("collapse group should hide all rows in a group", function() {
        grid.collapsibleGroups.collapse(0);
        expect(grid.getRowElm(1)[0].style.display).toBe('none');
        expect(grid.getRowElm(2)[0].style.display).toBe('none');
        expect(grid.getRowElm(3)[0].style.display).toBe('none');
    });

    it("expand group should show all rows in a group", function() {
        grid.collapsibleGroups.expand(0);
        expect(grid.getRowElm(1)[0].style.display).toBe('');
        expect(grid.getRowElm(2)[0].style.display).toBe('');
        expect(grid.getRowElm(3)[0].style.display).toBe('');
    });

    it("toggle should toggle collapse to expand", function() {
        grid.collapsibleGroups.collapse(0);
        grid.collapsibleGroups.toggle(0);
        expect(grid.getRowElm(1)[0].style.display).toBe('');
        expect(grid.getRowElm(2)[0].style.display).toBe('');
        expect(grid.getRowElm(3)[0].style.display).toBe('');
    });

    it("toggle should toggle expand to collapse", function() {
        grid.collapsibleGroups.toggle(0);
        expect(grid.getRowElm(1)[0].style.display).toBe('none');
        expect(grid.getRowElm(2)[0].style.display).toBe('none');
        expect(grid.getRowElm(3)[0].style.display).toBe('none');
    });

    it("collapse should adjust the heights of the chunks involved", function() {
        var height = grid.templateModel.getHeight(grid.getData(), 0, grid.getData().length - 1);
        grid.collapsibleGroups.collapse(0);
        expect(grid.templateModel.getHeight(grid.getData(), 0, grid.getData().length - 1)).toBe(height - 30);
    });

    it("expand should adjust the heights of the chunks involved", function() {
        var height = grid.templateModel.getHeight(grid.getData(), 0, grid.getData().length - 1);
        grid.collapsibleGroups.collapse(0);
        grid.collapsibleGroups.expand(0);
        expect(grid.templateModel.getHeight(grid.getData(), 0, grid.getData().length - 1)).toBe(height);
    });

});