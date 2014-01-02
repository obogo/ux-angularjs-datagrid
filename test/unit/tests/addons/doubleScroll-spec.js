describe("doubleScroll", function () {
    var scope, element, grid,
        template = '<div style="overflow: auto;width:100%;height:300px;border:1px solid #FF0000;" data-ux-double-scroll="\'.datagrid\'">' +
                    '<div class="doubleScrollContent" style="width: 100%;">' +
                            '<div class="header" style="height: 100px;">header text</div>' +
                            '<div data-ux-datagrid="items" class="datagrid" data-options="{chunkSize:10}" style="width:100%;height:400px; overflow: auto;" data-addons="iosScroll">' +
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
            angular.element(document.body).append(element[0]);
            $compile(element)(scope);
            $rootScope.$digest();
            grid = scope.datagrid;
        });
    });

    afterEach(function () {
        element.remove();
    });

    it("should scroll the main container", function(done) {
        element[0].scrollTop = 10;
        setTimeout(function () {
            expect(scope.datagrid.values.scroll).toBe(0);
            expect(scope.datagrid.element[0].style.overflow).toBe("hidden");
            done();
        });
    });

    it("should scroll the target container when the main container is disabled", function(done) {
        element[0].scrollTop = 400;
        setTimeout(function () {
            expect(scope.datagrid.element[0].style.overflow).toBe("auto");
            done();
        });
    });

    describe('iosDoubleScroll', function () {

        beforeEach(function () {
            if (element) {
                element.remove();
            }
            var inject = angular.injector(['ng','ux']).invoke;
            inject(function ($compile, $rootScope) {
                ux.datagrid.isIOS = true;
                scope = $rootScope.$new();
                scope.items = [];
                for (var i = 0; i < 100; i += 1) {
                    scope.items.push({id: i.toString()});
                }
                element = angular.element(template);
                angular.element(document.body).append(element[0]);
                $compile(element)(scope);
                $rootScope.$digest();
                grid = scope.datagrid;
            });
        });

        afterEach(function () {
            ux.datagrid.isIOS = false;
            element.remove();
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


        it("should disable the target container while scrolling the main container", function (done) {
            var el = element.children()[0];
            trigger(el, 'touchstart', {touches: [
                {pageX: 200, pageY: 200}
            ]});
            trigger(el, 'touchmove', {changedTouches: [
                {pageX: 200, pageY: 190}
            ]});
            setTimeout(function () {
                expect(scope.datagrid.scrollModel.enable()).toBe(false);
                trigger(el, 'touchend', {});
                done();
            }, 100);
        });


        it("should enable the target container when the main container reaches the bottom", function (done) {
            var el = element.children()[0];
            setTimeout(function () {
                trigger(el, 'touchstart', {touches: [
                    {pageX: 200, pageY: 200}
                ]});
                trigger(el, 'touchmove', {changedTouches: [
                    {pageX: 200, pageY: 90}
                ]});
                trigger(el, 'touchend', {});
            }, 100);
            setTimeout(function () {
                expect(scope.datagrid.scrollModel.enable()).toBe(true);
                done();
            }, 100);
        });

        it("should disable the main container while scrolling the target container", function (done) {
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
                el = scope.datagrid.getContent()[0];
                trigger(el, 'touchstart', {touches: [
                    {pageX: 200, pageY: 200}
                ]});
                trigger(el, 'touchmove', {changedTouches: [
                    {pageX: 200, pageY: 50}
                ]});
            }, 100);
            setTimeout(function () {
                expect(scope.datagrid.scrollModel.enable()).toBe(true);
                expect(scope.datagrid.scrollModel.getValues().scroll).toBe(150);
                trigger(el, 'touchend', {});
                done();
            }, 100);
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
                el = scope.datagrid.getContent()[0];
                trigger(el, 'touchstart', {touches: [
                    {pageX: 200, pageY: 200}
                ]});
                trigger(el, 'touchmove', {changedTouches: [
                    {pageX: 200, pageY: 50}
                ]});
                trigger(el, 'touchend', {});
                // now scroll back up.
                trigger(el, 'touchstart', {touches: [
                    {pageX: 200, pageY: 200}
                ]});
                trigger(el, 'touchmove', {changedTouches: [
                    {pageX: 200, pageY: 500}
                ]});
                trigger(el, 'touchend', {});
            }, 100);
            setTimeout(function () {
                expect(scope.datagrid.scrollModel.enable()).toBe(false);
                expect(scope.datagrid.scrollModel.getValues().scroll).toBe(0);
                done();
            }, 100);
        });
    });
});