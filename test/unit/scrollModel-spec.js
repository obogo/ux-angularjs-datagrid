describe("scrollModel", function () {

    var model, rendered;

    beforeEach(function () {
        rendered = false;
        model = ux.datagrid.coreAddons.scrollModel({
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
            dispatch: function () {

            }
        });
        model.flow.run();
    });

    it("should update the scroll values", function() {
        model.onUpdateScroll({
            target: {
                scrollTop: 40
            }
        });
        expect(model.values.scroll).toBe(40);
    });

    it("should render after scroll update", function() {
        model.onUpdateScroll({
            target: {
                scrollTop: 1
            }
        });
        expect(rendered).toBe(true);
    });

    it("should update the speed correctly", function() {
        // this needs to be async to run.
        model.flow.async = true;
        model.options = {updateDelay: 1};
        model.onUpdateScroll({
            target: {
                scrollTop: 50
            }
        });
        expect(model.values.speed).toBe(50);
    });

    it("scrollToIndex should scroll to the correct index", function() {

    });

    it("scrollToItem should scroll to the item", function() {

    });

    it("getNormalizedIndex should get the index in the normalized array of the item that is passed", function() {

    });

});