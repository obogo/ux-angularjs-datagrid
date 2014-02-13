describe("gridFocusManager", function () {
    var scope, element, grid, forceRenderAll,
        template = '<div data-ux-datagrid="items" class="datagrid" data-options="{debug:{all:1}, chunkSize:10, async: false}" style="width:100px;height:400px;overflow:auto;" data-addons="gridFocusManager, gridLogger">' +
                        '<script type="template/html" data-template-name="default" data-template-item="item">' +
                            '<div class="mock-row">' +
                                '<div class="col col1">{{item.id}}</div>' +
                                '<div class="col col1" data-ng-repeat="col in item.cols"><input type="text" data-ng-model="col.value"></div>' +
                                '<div class="col"></div>' +
                            '</div>' +
                        '</script>' +
                    '</div>';

    function fireKey(el, key, shift) {
        //Set key to corresponding code. This one is set to the left arrow key.
        var eventObj = document.createEventObject ? document.createEventObject() : document.createEvent("Events");
        if (eventObj.initEvent) eventObj.initEvent("keydown", true, true);
        eventObj.keyCode = eventObj.witch = key;
        eventObj.shiftKey = !!shift;
        if(document.createEventObject) {
            el.fireEvent("onkeydown", eventObj);
        } else if(document.createEvent) {
            el.dispatchEvent(eventObj);
        }
    }

    beforeEach(function () {
//        console.clear();
        var inject = angular.injector(['ng','ux']).invoke;
        inject(function ($compile, $rootScope) {
            scope = $rootScope.$new();
            scope.items = [];
            for (var i = 0; i < 100; i += 1) {
                scope.items.push({id: i.toString(), cols:i !== 2 ? [{row: i, id:0, value:0},{row: i, id:1, value:0},{row: i, id:1, value:0}] : []});
            }
            element = angular.element(template);
            document.body.appendChild(element[0]);
            $compile(element)(scope);
            $rootScope.$digest();
            grid = scope.$$childHead.datagrid;
        });

        forceRenderAll = function () {
            var len = grid.getData().length;
            for (var i = 0; i < len; i += 1) {
                grid.forceRenderScope(i);
            }
        }
    });

    afterEach(function () {
        element.remove();
        document.body.focus();
        forceRenderAll = null;
    });

    it("should handle enter key on keydown for an input", function() {
        var q = grid.gridFocusManager.query,
            input = q(element, 'input')[0],
            rows = q(element, '.mock-row');
        input.focus();
        fireKey(input, 13);
        expect(document.activeElement).toBe(q(rows[1], 'input')[0]);
    });

    it("should focus to the same element in the next row on enter key", function() {
        var q = grid.gridFocusManager.query,
            input = q(element, 'input')[1],
            rows = q(element, '.mock-row');
        input.focus();
        fireKey(input, 13);
        expect(document.activeElement).toBe(q(rows[1], 'input')[1]);
    });

    it("should focus to the same element in the prev row on shift enter key", function() {
        var q = grid.gridFocusManager.query,
            input = q(element, 'input')[4],
            rows = q(element, '.mock-row');
        input.focus();
        fireKey(input, 13, true);
        expect(document.activeElement).toBe(q(rows[0], 'input')[1]);
    });

    it("should jump over a row that does not have a match for that element on enter key", function() {
        var q = grid.gridFocusManager.query,
            input = q(element, 'input')[0],
            rows = q(element, '.mock-row');
        input.focus();
        fireKey(input, 13);
        expect(document.activeElement).toBe(q(rows[1], 'input')[0]);
    });

    it("should jump over a row that does not have a match for that element on shift enter key", function() {
        var q = grid.gridFocusManager.query,
            input = q(element, 'input')[4],
            rows = q(element, '.mock-row');
        input.focus();
        fireKey(input, 13);
        expect(document.activeElement).toBe(q(rows[3], 'input')[1]);
    });

    it("should not loose focus when in the last row and enter key is pressed", function() {
        var q = grid.gridFocusManager.query, input;
        grid.scrollModel.scrollToBottom(true);
        // we need to wait until all are rendered or the count will be off.
        forceRenderAll();
        input = q(element, 'input')[295]; // 3 inputs per row and remember row 3 doesn't have any inputs.
        input.focus();
        fireKey(input, 13);
        expect(document.activeElement).toBe(input);
    });

    it("should not loose focus when in the first row and shift enter key is pressed", function() {
        forceRenderAll();
        var q = grid.gridFocusManager.query,
            input = q(element, 'input')[1],
            rows = q(element, '.mock-row');
        input.focus();
        fireKey(input, 13, true);
        expect(document.activeElement).toBe(q(rows[0], 'input')[1]);
    });
});