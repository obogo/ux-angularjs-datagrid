/*global angular, runner*/
(function () {
    'use strict';
    angular.module("ux").run(function (runner) {
        runner.locals.goHome = function () {
            runner.locals.scene("go to Home", function (find, wait) {
                wait(500);// just in case the app isn't loaded.
                find("a[href='#/home']").sendMouse();
                find(".page-title:eq(1)").text().toBe('Home');
            });
        };
    });
}());