describe("infiniteScrollModel", function () {
    var element, grid, scope,
        template = '<div data-ux-datagrid="items" class="datagrid" data-options="{chunkSize:10, async:false, infiniteScroll: {limit:21}}" data-addons="infiniteScroll" style="width:100px;height:100px;">' +
                        '<script type="template/html" data-template-name="default" data-template-item="item">' +
                            '<div class="mock-row" style="height:10px;">{{item.id}}</div>' +
                        '</script>' +
                    '</div>';

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

    function setup(tpl) {
        var inject = angular.injector(['ng','ux']).invoke;
        inject(function ($compile, $rootScope) {
            scope = $rootScope.$new();
            scope.items = createSimpleList(20);
            scope.$on(ux.datagrid.events.ON_SCROLL_TO_BOTTOM, function () {
                scope.scrollToBottomFired = true;
                if (scope.items.length < grid.options.infiniteScroll.limit) {
                    scope.items = scope.items.concat(createSimpleList(20, scope.items.length));
                }
            });
            element = angular.element(tpl);
            document.body.appendChild(element[0]);
            $compile(element)(scope);
            $rootScope.$digest();
            grid = scope.$$childHead.datagrid;
        });
    }

    afterEach(function () {
        element.remove();
    });

    it("should not fire scrollToBottom until it scrolls to it.", function() {
        setup(template);
        grid.scrollModel.scrollTo(90, true);
        expect(scope.scrollToBottomFired).toBeUndefined();
    });

    it("should fire scrollToBottom event when it reaches the last row.", function() {
        setup(template);
        grid.scrollModel.scrollTo(110, true);
        expect(scope.scrollToBottomFired).toBe(true);
    });

    it("should add one row for the loading row to the datagrid data", function() {
        setup(template);
        expect(grid.data.length).toBe(21);
    });

    it("should not add the extra row if it is past the options.infiniteScroll.limit", function() {
        setup('<div data-ux-datagrid="items" class="datagrid" data-options="{chunkSize:10, async:false, infiniteScroll: {limit:20}}" data-addons="infiniteScroll" style="width:100px;height:100px;">' +
                    '<script type="template/html" data-template-name="default" data-template-item="item">' +
                        '<div class="mock-row" style="height:10px;">{{item.id}}</div>' +
                    '</script>' +
                '</div>');
        expect(scope.items.length).toBe(grid.data.length);
    });

    it("should not add more extra rows after it loads a row and reaches the limit", function() {
        setup('<div data-ux-datagrid="items" class="datagrid" data-options="{chunkSize:10, async:false, infiniteScroll: {limit:40}}" data-addons="infiniteScroll" style="width:100px;height:100px;">' +
                    '<script type="template/html" data-template-name="default" data-template-item="item">' +
                        '<div class="mock-row" style="height:10px;">{{item.id}}</div>' +
                    '</script>' +
                '</div>');
        grid.scrollModel.scrollTo(110, true);// force first call
        scope.$digest();
        grid.scrollModel.scrollTo(210, true);// force second call which should not fire.
        scope.$digest();
        expect(scope.items.length).toBe(grid.data.length);
    });
});