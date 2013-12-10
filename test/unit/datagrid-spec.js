describe('datagrid', function () {
    var templates = {
        simple: '<div data-ux-datagrid="items" class="datagrid" data-options="{chunkSize:10, async:false}">' +
                    '<script type="template/html" data-template-name="default" data-template-item="item">' +
                        '<div class="row {{fake}}">{{item.id}}</div>' +
                    '</script>' +
                '</div>',
        grouped: ""
        },
        element,
        scope;
    beforeEach(function () {
        var inject = angular.injector(['ng','ux']).invoke;
        inject(function ($compile, $rootScope) {
            scope = $rootScope.$new();
            scope.items = [];
            for (var i = 0; i < 100; i += 1) {
                scope.items.push({id:i});
            }
            element = angular.element(templates.simple);
            $compile(element)(scope);
            $rootScope.$digest();
        });
    });

    describe("options", function () {
        it("should read options from the html options attribute.", function() {
            expect(scope.datagrid.options.chunkSize).toBe(10);
        });
    });

    describe("simple template", function () {
        it("should add a content div", function() {
            expect(element[0].childNodes[0].className).toBe('content');
        });

        it("should only have one child element. So it has removed all templates.", function () {
            expect(element[0].childNodes.length).toBe(1);
        });

        it("should create 10 chunks when chunk size is 10 and there are 100 rows.", function() {
            expect(element[0].childNodes[0].childNodes.length).toBe(10); // 10 chunks of 10 rows each
        })

        it("should create 10 chunks with 10 rows in each chunk if there are 100 rows.", function() {
            expect(element[0].childNodes[0].childNodes[0].childNodes.length).toBe(10);
        });

        it("reset should clear the dom and rebuild it", function() {
            var el = element[0].childNodes[0];
            el.beforeReset = true;
            expect(element[0].childNodes[0].beforeReset).toBe(true);
            scope.datagrid.reset();
            expect(element[0].childNodes[0].beforeReset).toBe(undefined);
        });
    });
});