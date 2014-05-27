/*global */
(function () {
    'use strict';

    function scenarios(scenario, scene, repeatScene, find, options, wait, $, assert, repeat) {

        var ng = options.window.angular.element;

        function isRowAtTop(index) {
            var el = $('[row-id=' + index + ']');
            return ng(el).scope().$index == index && el.offset().top <= $('.datagrid').offset().top;
        }

        function getSelector(row, col) {
            return "[row-id='" + row + "'] div[data-ng-repeat='col in item.cols'].col.col1 input[type='text'][data-ng-model='col.value']:eq(" + col + ")";
        }

        function getRowAndColumn(row, col) {
            return find(getSelector(row, col));
        }

        function focusToRowAndColumn(row, col) {
            return getRowAndColumn(row, col).sendMouse(true);
        }

        function getActiveElement() {
            return options.window.document.activeElement;
        }

        function focusManagerScenario(goHome) {
            var index = 2;

            goHome();

            scene("navigate to focusManager page", function () {
                find("a[href='#/addons/gridFocusManager']").sendMouse();
            });

            scene("focus to the first input.", function () {
                wait(500);
                var datagrid = ng($('.datagrid')).scope().datagrid;
                if (options.window.ux.datagrid.options.chunks.detachDom) {
                    wait(20000);// wait 20 seconds for creeping to render several chunks so we can check the detachment of dom.
                }
                focusToRowAndColumn(1, 0).sendKeys('1 enter').val().toBe('1');

                repeat(function () {
                    find(getActiveElement).sendKeys('1 enter').val().toBe('1');
                    wait(10);
                }, 40);

                find('.datagrid').scrollTop(0);
                wait(500);

                focusToRowAndColumn(1, 1).sendKeys('2 enter').val().toBe('2');

                repeat(function () {
                    find(getActiveElement).sendKeys('2 enter').val().toBe('2');
                    wait(10);
                }, 40);
            });
        }

        function enableDetachDomMode() {
            options.window.ux.datagrid.options.chunks.detachDom = 1;
            options.window.ux.datagrid.options.chunks.size = 10;
        }

        function disableDetachDomModel() {
            options.window.ux.datagrid.options.chunks.detachDom = false;
            options.window.ux.datagrid.options.chunks.size = 50;
        }

        scenario("FocusManager", focusManagerScenario);
        scenario("ChunkModel enable detachDom mode", enableDetachDomMode);
        scenario("FocusManager in detachDom mode", focusManagerScenario);
        scenario("ChunkModel disable detachDom mode", disableDetachDomModel);
    }

    ux.runner.addScenario('Focus Manager', scenarios);

}());