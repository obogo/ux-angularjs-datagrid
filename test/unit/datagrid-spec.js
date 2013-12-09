describe('datagrid', function () {
    var templates = {
        simple: '<div data-ux-datagrid="items" class="datagrid">' +
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
            element = angular.element(templates.simple);
            $compile(element)(scope);
        });
    });

    describe("simple template", function () {
        it("should add a content div", function() {
            expect(element[0].childNodes[0].className).toBe('content');
        });

        it("should only have one child element. So it has removed all templates.", function () {

        });

        it("should create X number of chunks when chunk size is x and there are y rows.", function() {

        });
    });
});