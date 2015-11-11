/* global angular *///ignore
(function () {//ignore
    var name = 'gridLogger';
    angular.module(name, ['ux'])
        .controller('tabs', function ($scope) {//ignore
            $scope.tab = 'html';//ignore
        })//ignore
        .controller('ctrl', function ($scope) {
            var i = 0, len = 100, items = [], types = ['row', 'alt1', 'alt2'];
            while (i < len) {
                items.push({id: i, type: types[Math.floor(Math.random() * types.length)]});
                i += 1;
            }
            $scope.items = items;
        });
    angular.module('ux').factory('whichTemplate', function () {

        return ['inst', function (inst) {
            // now we override it with our method so we decide what template gets displayed for each row.
            inst.templateModel.getTemplate = function (item) {
                // item would be the item in your array of data provided to the datagrid.
                // let's make our default option be 'row'. Otherwise datagrid defaults this to 'default'.
                var name = item.type || 'row';
                // now we get the template from the name.
                return inst.templateModel.getTemplateByName(name);
            };
        }];
    });
    var el = document.querySelector("*[ng-app='" + name + "']"), strapped = false;//ignore
    window.addEventListener('scroll', function () {//ignore
        if (!strapped && hb.isElementInViewport(el)) {//ignore
            strapped = true;
            angular.bootstrap(el, [name]);//ignore
        }//ignore
    });//ignore
}());//ignore
