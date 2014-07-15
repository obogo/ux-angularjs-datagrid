describe("scrollBounce", function () {

    var inst, injector;
    beforeEach(function () {
        var content = {
            '0': document.createElement('div'),
            called: false,
            css: function () {
                this.called = true;
            }
        };
        injector = angular.injector(['ng','ux']);
        inst = {
            values: {scroll:0, speed:0},
            scope: {},
            unwatchers: [],
            getContent: function () {
                return content;
            }
        };
        ux.dispatcher(inst.scope);
        inst.scope.$on = inst.scope.on;
        injector.get('scrollBounce')[1](inst);
    });

    it("should listen to the top event", function() {
        var listeners = inst.scope.getListeners(ux.datagrid.events.ON_SCROLL_TO_TOP);
        expect(listeners.length).toBe(1);
    });

    it("should listen to the bottom event", function() {
        var listeners = inst.scope.getListeners(ux.datagrid.events.ON_SCROLL_TO_BOTTOM);
        expect(listeners.length).toBe(1);
    });

    it("should NOT apply the styles until the scroll to top is fired", function() {
        expect(inst.getContent()[0].style.webkitTransition).toBeDefined();
    });

    it("should apply the styles when scroll to top is fired", function() {
        inst.scope.dispatch(ux.datagrid.events.ON_SCROLL_TO_TOP);
        expect(inst.getContent().called).toBe(true);
    });

    it("should apply the styles when scroll to bottom is fired", function() {
        inst.scope.dispatch(ux.datagrid.events.ON_SCROLL_TO_BOTTOM);
        expect(inst.getContent().called).toBe(true);
    });

});