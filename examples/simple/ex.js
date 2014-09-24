/* global angular */
(function () {
    var name = 'ex1';
    angular.module(name, ['ux'])
        .controller('tabs', function ($scope) {
            $scope.tab = 'html';
        })
        .controller('ctrl', function ($scope) {
            var i = 0, len = 100, items = [];
            while (i < len) {
                items.push({id: i});
                i += 1;
            }
            $scope.items = items;
        });
}());