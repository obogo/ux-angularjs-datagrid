/* global angular *///ignore
(function () {//ignore
    var name = 'sorting';
    angular.module(name, ['ux'])
        .controller('tabs', function ($scope) {//ignore
            $scope.tab = 'html';//ignore
        })//ignore
        .controller('ctrl', function ($scope) {
            var i = 0, len = 100, items = [];
            while (i < len) {
                items.push({id: i});
                i += 1;
            }
            $scope.items = items;

            $scope.$on(ux.datagrid.events.ON_STARTUP_COMPLETE, function(evt, grid) {
                $scope.grid = grid;
            });
        });
    angular.bootstrap(document.querySelector("*[ng-app='" + name + "']"), [name]);//ignore
}());//ignore
