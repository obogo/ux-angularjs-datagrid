describe("chunkModel", function () {

    var chunkModel, exports, rowHeight;

    beforeEach(function () {
        exports = {
            options: {
                chunkClass: 'datagrid-chunk',
                chunkReadyClass: 'datagrid-chunk-ready'
            },
            templateModel: {
                templates: {},
                getTemplate: function (name) {
                    return this.templates[name];
                },
                getHeight: function (list, startIndex, endIndex) {
                    return (endIndex + 1 - startIndex) * rowHeight;
                }
            }
        }
        rowHeight = 10;
        chunkModel = new ux.datagrid.coreAddons.chunkModel(exports);
    });

    function createTests() {
        var i,
            tests = [
                // chunk size 3
                {input: '123456789', find: '4', chunkSize: 3, expected: [1, 0]},
                {input: 'abcdefghijkl', find: 'g', chunkSize: 3, expected: [0, 2, 0]},
                {input: 'abcdefghijklmnoqrs', find: 'i', chunkSize: 3, expected: [0, 2, 2]},
                {input: 'abcdefghijklmnoqrs', find: 'k', chunkSize: 3, expected: [1, 0, 1]},
                {input: 'abcdefghijklmnoqrs', find: 'r', chunkSize: 3, expected: [1, 2, 1]},
                {input: 'abcdefghijklmnoqrs', find: 's', chunkSize: 3, expected: [1, 2, 2]},
                {input: 'abcdefghijklmnoqrstuvwxy', find: 'x', chunkSize: 3, expected: [2, 1, 1]},
                {input: 'abcdefghijklmnoqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', find: 'X', chunkSize: 3, expected: [1, 2, 1, 0]},

                // chunk size 4
                {input: '123456789', find: '4', chunkSize: 4, expected: [0, 3]},
                {input: 'abcdefghijkl', find: 'g', chunkSize: 4, expected: [1, 2]},
                {input: 'abcdefghijklmnoqrs', find: 'i', chunkSize: 4, expected: [0, 2, 0]},
                {input: 'abcdefghijklmnoqrs', find: 'k', chunkSize: 4, expected: [0, 2, 2]},
                {input: 'abcdefghijklmnoqrs', find: 'r', chunkSize: 4, expected: [1, 0, 0]},
                {input: 'abcdefghijklmnoqrs', find: 's', chunkSize: 4, expected: [1, 0, 1]},
                {input: 'abcdefghijklmnoqrstuvwxy', find: 'x', chunkSize: 4, expected: [1, 1, 2]},
                {input: 'abcdefghijklmnoqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', find: 'X', chunkSize: 4, expected: [3, 0, 0]},

                {input: createList(500), find: '250', chunkSize: 10, expected: [2, 4, 9]},
                {input: createList(1000), find: '901', chunkSize: 10, expected: [9, 0, 0]},
                {input: createList(5000), find: '250', chunkSize: 10, expected: [0, 2, 4, 9]},
                {input: createList(50000), find: '25000', chunkSize: 100, expected: [2, 49, 99]},
                {input: createList(50000), find: '49267', chunkSize: 18, expected: [8, 8, 1, 0]},
            ];
        for (i = 0; i < tests.length; i += 1) {
            createTest(tests[i]);
        }
    }

    function createTest(test) {
        test.input = generateList(test.input);
        it("should return indexes " + test.expected.join(',') + " when length of " + test.input.length + " chunk of " + test.chunkSize + " and find index of \"" + test.find + "\"", function () {
            run(test.input, test.find, test.chunkSize, test.expected);
        });
    }

    function createList(len) {
        var i, list = [];
        for (i = 0; i < len; i += 1) {
            list[i] = (i + 1).toString();
        }
        return list;
    }

    function generateList(input) {
        if (typeof input === "string") {
            return input.split('');
        }
        if (typeof input === "function") {
            return input();
        }
        return input;
    }

    function run(list, find, chunkSize, result) {
        var i, rowIndex = list.indexOf(find);
        for (i = 0; i < list.length; i += 1) {
            exports.templateModel.templates[list[i]] = {
                name: list[i],
                item: 'item',
                height: 10,
                template: '<div class="row row-' + i + '">' + list[i] + '</div>'
            };
        }
        var el = angular.element('<div></div>');
        chunkModel.chunkDom(list, chunkSize, '<div class="chunky">', '</div>', el);
//        console.log("original %o", el.childNodes[0]);
        var indexes = chunkModel.getRowIndexes(rowIndex);
        el = chunkModel.getRow(rowIndex);
        expect(indexes).toEqual(result);
        expect(el.html()).toEqual(find);
    }

    createTests();

    describe("changing row template", function () {
        var scope, element, grid,
            template = '<div data-ux-datagrid="items" class="datagrid" data-options="{chunkSize:10, async:false}" style="width:100px;height:400px;">' +
                            '<script type="template/html" data-template-name="default" data-template-item="item">' +
                                '<div class="mock-row" style="height:10px;">{{item.id}}</div>' +
                            '</script>' +
                            '<script type="template/html" data-template-name="alternate" data-template-item="item">' +
                                '<div class="mock-row" style="height:15px;">{{item.id}}</div>' +
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

        it("should swap the template for the row", function() {
            var height = grid.getContentHeight();
            grid.templateModel.setTemplate(0, 'alternate');
            expect(grid.getContentHeight()).toBe(height + 5);
        });

        it("should update all of the chunks above it to the correct style heights.", function() {
            grid.templateModel.setTemplate(0, 'alternate');
            expect(grid.getContent().css("height")).toBe("1005px");
        });
    });

});