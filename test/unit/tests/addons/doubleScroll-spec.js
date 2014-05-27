describe("doubleScroll", function () {
    var scope, element, grid,
        template = '<div style="overflow: auto;width:100%;height:300px;border:1px solid #FF0000;" data-ux-double-scroll="\'.datagrid\'">' +
                    '<div class="doubleScrollContent" style="width: 100%;">' +
                            '<div class="header" style="height: 100px;">header text</div>' +
                            '<div data-ux-datagrid="items" class="datagrid" data-options="{async:false,chunkSize:10, scrollModel:{manual:true}}" style="width:100%;height:400px; overflow: auto;" data-addons="">' +
                                '<script type="template/html" data-template-name="default" data-template-item="item">' +
                                    '<div class="mock-row" style="height: 16px;outline: 1px solid #000000;">{{$id}}</div>' +
                                '</script>' +
                            '</div>' +
                        '</div>' +
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
        grid = null;
    });

    it("should scroll the main container", function(done) {
        element[0].scrollTop = 10;
        setTimeout(function () {
            expect(grid.element[0].scrollTop).toBe(0);
            expect(grid.element[0].style.overflowY).toBe("hidden");
            done();
        }, 100);
    });

    it("should scroll the target container when the main container is disabled", function(done) {
        element[0].scrollTop = 400;
        setTimeout(function () {
            expect(grid.element[0].style.overflowY).toBe("auto");
            done();
        }, 100);
    });

});