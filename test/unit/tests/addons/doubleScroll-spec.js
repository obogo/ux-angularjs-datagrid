describe("doubleScroll", function () {
    var scope, element, grid,
        template = '<div style="overflow: auto;width:100%;height:300px;border:1px solid #FF0000;" data-ux-double-scroll="\'.datagrid\'">' +
                    '<div class="doubleScrollContent" style="width: 100%;">' +
                            '<div class="header" style="height: 100px;">header text</div>' +
                            '<div data-ux-datagrid="items" class="datagrid" data-options="{async:false,chunkSize:10}" style="width:100%;height:400px; overflow: auto;" data-addons="iosScroll">' +
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
            expect(grid.values.scroll).toBe(0);
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

describe('iosDoubleScroll', function () {
    var scope, element, grid,
        template = '<div style="overflow: auto;width:100%;height:300px;border:1px solid #FF0000;" data-ux-double-scroll="\'.datagrid\'">' +
                    '<div class="doubleScrollContent" style="width: 100%;">' +
                            '<div class="header" style="height: 100px;">header text</div>' +
                            '<div data-ux-datagrid="items" class="datagrid" data-options="{async: false, chunkSize:10, debug: {all:1, Flow:0}}" style="width:100%;height:400px; overflow: auto;" data-addons="iosScroll, gridLogger">' +
                                '<script type="template/html" data-template-name="default" data-template-item="item">' +
                                    '<div class="mock-row" style="height: 16px;outline: 1px solid #000000;">{{$id}}</div>' +
                                '</script>' +
                            '</div>' +
                        '</div>' +
                    '</div>';

    beforeEach(function () {
        var inject = angular.injector(['ng','ux']).invoke;
        inject(function ($compile, $rootScope) {
            ux.datagrid.isIOS = true;
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
            scope.doubleScroll.virtualScroll.async = grid.options.async;
        });
    });

    afterEach(function () {
        ux.datagrid.isIOS = false;
        element.remove();
        grid = null;
    });

    function trigger(el, name, eventData) {
        var eventObj = document.createEventObject ? document.createEventObject() : document.createEvent("Events");
        if (eventObj.initEvent) eventObj.initEvent(name, true, true);
        angular.extend(eventObj, eventData);
        if(document.createEventObject) {
            el.fireEvent("on" + name, eventObj);
        } else if(document.createEvent) {
            el.dispatchEvent(eventObj);
        }
    }


    it("should disable the target container while scrolling the main container", function () {
        var el = element.children()[0];
        trigger(el, 'touchstart', {touches: [
            {pageX: 200, pageY: 200}
        ]});
        trigger(el, 'touchmove', {changedTouches: [
            {pageX: 200, pageY: 190}
        ]});
        expect(grid.scrollModel.enable()).toBe(false);
        trigger(el, 'touchend', {});
    });


    it("should enable the target container when the main container reaches the bottom", function () {
        var el = element.children()[0];
        trigger(el, 'touchstart', {touches: [
            {pageX: 200, pageY: 200}
        ]});
        trigger(el, 'touchmove', {changedTouches: [
            {pageX: 200, pageY: 90}
        ]});
        trigger(el, 'touchend', {});
        expect(grid.scrollModel.enable()).toBe(true);
    });

    it("should disable the main container while scrolling the target container", function () {
        // wait for content to be ready.
        var el = element.children()[0];
        trigger(el, 'touchstart', {touches: [
            {pageX: 200, pageY: 200}
        ]});
        trigger(el, 'touchmove', {changedTouches: [
            {pageX: 200, pageY: 50}
        ]});
        trigger(el, 'touchend', {});
        // now change to the datagrid content.
        el = grid.getContent()[0];
        trigger(el, 'touchstart', {touches: [
            {pageX: 200, pageY: 200}
        ]});
        trigger(el, 'touchmove', {changedTouches: [
            {pageX: 200, pageY: 50}
        ]});
        expect(grid.scrollModel.enable()).toBe(true);
        expect(grid.scrollModel.getValues().scroll).toBe(150);
        trigger(el, 'touchend', {});
    });

    it("should enable the main container when the target container scrolls back to the top.", function (done) {
        // wait for content to be ready.
        var el = element.children()[0];
        setTimeout(function () {
            trigger(el, 'touchstart', {touches: [
                {pageX: 200, pageY: 200}
            ]});
            trigger(el, 'touchmove', {changedTouches: [
                {pageX: 200, pageY: 50}
            ]});
            trigger(el, 'touchend', {});
            // now change to the datagrid content.
            el = grid.getContent()[0];
            trigger(el, 'touchstart', {touches: [
                {pageX: 200, pageY: 200}
            ]});
            trigger(el, 'touchmove', {changedTouches: [
                {pageX: 200, pageY: 50}
            ]});
            trigger(el, 'touchend', {});
            // now scroll back up.
            setTimeout(function () {
                trigger(el, 'touchstart', {touches: [
                    {pageX: 200, pageY: 200}
                ]});
                trigger(el, 'touchmove', {changedTouches: [
                    {pageX: 200, pageY: 500}
                ]});
                trigger(el, 'touchend', {});
            },100);
        }, 100);
        setTimeout(function () {
            expect(grid.scrollModel.enable()).toBe(false);
            expect(grid.scrollModel.getValues().scroll).toBe(0);
            setTimeout(done, 100);
        }, 500);
    });
});