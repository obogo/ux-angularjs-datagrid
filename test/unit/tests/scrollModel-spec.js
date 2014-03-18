describe("scrollModel", function () {

    var model, rendered;

    beforeEach(function () {
        console.clear();
        rendered = false;
        model = ux.datagrid.coreAddons.scrollModel({
            unwatchers: [],
            scope: {
                $on: function () {

                }
            },
            flow: new ux.datagrid.Flow({async: false}),
            render: function render() {
                rendered = true;
            },
            values: {
                scroll: 0,
                speed: 0,
                absSpeed: 0
            },
            getContentHeight: function () {
                return 0;
            },
            options: ux.extend({}, ux.datagrid.options),
            dispatch: function () {

            }
        });
        model.flow.run();
    });

    it("should update the scroll values", function() {
        model.scrollModel.onUpdateScroll({
            target: {
                scrollTop: 40
            }
        });
        expect(model.values.scroll).toBe(40);
    });

    it("should render after scroll update", function() {
        model.scrollModel.onUpdateScroll({
            target: {
                scrollTop: 1
            }
        });
        expect(rendered).toBe(true);
    });

    it("should update the speed correctly", function() {
        // this needs to be async to run.
        model.flow.async = true;
        model.options = ux.extend({updateDelay: 1}, ux.datagrid.options);
        model.scrollModel.onUpdateScroll({
            target: {
                scrollTop: 50
            }
        });
        expect(model.values.speed).toBe(50);
    });

});