/*global */
(function () {
    'use strict';

    function scenarios(scenario, scene, find, options, wait, $, assert) {

        var ng = options.window.angular.element;

        function isRowAtTop(index) {
            var el = $('[row-id=' + index + ']');
            return ng(el).scope().$index == index && el.offset().top <= $('.datagrid').offset().top;
        }

        scenario("Scrolling History", function (goHome) {
            goHome();

            scene("should load the simple grid example", function () {
                find("a[href='#/addons/scrollHistory']").sendMouse();
                find('.datagrid').until('scrolled to', function () {
                    var s = ng(this.element[0]).scope();
                    s.datagrid.scrollModel.scrollTo(s.datagrid.values.scroll + 20);
                    return s.datagrid.values.scroll > 2000;
                }, options.timeouts.medium);
                wait(500); // wait for grid to render.

                assert("row 25 should be at the top of the viewport.", function () {
                    return isRowAtTop(7);
                }, this);
            });

            scene("Jump to should take to the right row", function () {
                find('.content-area .stats a:eq(1)').text().toBe('10%');
                find('.content-area .stats a:eq(1)').sendMouse();
                wait(500);
                assert("is row 5000 at top",function () {
                    return isRowAtTop(5000);
                }, this);
            });
        });
    }

    ux.runner.addScenario('Scrolling History', scenarios);

}());