describe("expandRows", function () {

    var scope, element, grid,
        template = '<div data-ux-datagrid="items" class="datagrid" data-options="{chunkSize:10, async:false, expandRows:[{template:\'default\', cls:\'expandDefault\', style:{height: \'20px\'}, transition: false}]}" style="width:100px;height:400px;" data-addons="expandRows">' +
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

    afterEach(function () {
        element.remove();
    });

    it("expand should add the class from the options.expandRows that matches the template", function() {
        grid.expandRows.expand(0);
        expect(grid.getRowElm(0).hasClass('expandDefault')).toBe(true);
    });

    it("expand should change the height of the row", function() {
        grid.expandRows.expand(0);
        expect(grid.getRowElm(0).css("height")).toBe("20px");
    });

    it("should re-adjust the chunk style heights to the new calculated height", function() {
        grid.expandRows.expand(0);
        expect(grid.getRowElm(0).parent().css("height")).toBe("510px");
    });

    it("should remove a css class that will change the height back", function() {
        grid.expandRows.expand(0);
        grid.expandRows.collapse(0);
        expect(grid.getRowElm(0).css("height")).toBe("10px");
    });

    it("should restore the height of the chunk when collapsed", function() {
        grid.expandRows.expand(5);
        grid.expandRows.collapse(5);
        expect(grid.getRowElm(5).parent().css("height")).toBe("500px");
    });

    it("toggle should expand a row that is collapsed", function() {
        grid.expandRows.toggle(6);
        expect(grid.getRowElm(6).css("height")).toBe("20px");
    });

    it("toggle should collapse a row that is expanded", function() {
        grid.expandRows.toggle(7);
        grid.expandRows.toggle(7);
        expect(grid.getRowElm(7).css("height")).toBe("10px");
    });
});