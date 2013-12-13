describe("infiniteScrollModel", function () {
    var element,
        scope;

    function createSimpleList(len, offset) {
        var i, items = [];
        len = len || records;
        i = offset || 0;
        len += i;
        while (i < len) {
            items.push({id: i});
            i += 1;
        }
        return items;
    }

    describe("options", function () {
        var template = '<div data-ux-datagrid="items" class="datagrid" data-options="{chunkSize:10, async:false}" data-addons="infiniteScroll" style="width:100px;height:100px;">' +
                            '<script type="template/html" data-template-name="default" data-template-item="item">' +
                                '<div class="mock-row" style="height:10px;">{{item.id}}</div>' +
                            '</script>' +
                        '</div>'
        function setup(tpl) {
            var inject = angular.injector(['ng','ux']).invoke;
            inject(function ($compile, $rootScope) {
                scope = $rootScope.$new();
                scope.items = createSimpleList(20);
                scope.$on(ux.datagrid.events.SCROLL_TO_BOTTOM, function () {
                    scope.scrollToBottomFired = true;
                    if (scope.items.length < scope.datagrid.options.infiniteScrollLimit) {
                        scope.items = scope.items.concat(createSimpleList(20, scope.items.length));
                    }
                });
                element = angular.element(tpl);
                $compile(element)(scope);
                $rootScope.$digest();
            });
        }

        it("should not fire scrollToBottom until it scrolls to it.", function() {
            setup(template);
            scope.datagrid.scrollModel.scrollTo(200, true);
            expect(scope.scrollToBottomFired).toBeUndefined();
        });

        it("should fire scrollToBottom event when it reaches the last row.", function() {
            setup(template);
            scope.datagrid.scrollModel.scrollTo(210, true);
            expect(scope.scrollToBottomFired).toBe(true);
        });

        it("should add one row for the loading row to the datagrid data", function() {
            setup(template);
            expect(scope.items.length + 1).toBe(scope.datagrid.data.length);
        });

        it("should not add the extra row if it is past the options.infiniteScrollLimit", function() {
            setup('<div data-ux-datagrid="items" class="datagrid" data-options="{chunkSize:10, async:false, infiniteScrollLimit:20}" data-addons="infiniteScroll" style="width:100px;height:100px;">' +
                        '<script type="template/html" data-template-name="default" data-template-item="item">' +
                            '<div class="mock-row" style="height:10px;">{{item.id}}</div>' +
                        '</script>' +
                    '</div>');
            expect(scope.items.length).toBe(scope.datagrid.data.length);
        });

        it("should not add more extra rows after it loads a row and reaches the limit", function() {
            setup('<div data-ux-datagrid="items" class="datagrid" data-options="{chunkSize:10, async:false, infiniteScrollLimit:40}" data-addons="infiniteScroll" style="width:100px;height:100px;">' +
                        '<script type="template/html" data-template-name="default" data-template-item="item">' +
                            '<div class="mock-row" style="height:10px;">{{item.id}}</div>' +
                        '</script>' +
                    '</div>');
            scope.datagrid.scrollModel.scrollTo(210, true);// force first call
            scope.datagrid.scrollModel.scrollTo(410, true);// force second call which should not fire.
            expect(scope.items.length).toBe(scope.datagrid.data.length);
        });
    });
});