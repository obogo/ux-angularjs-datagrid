/* global angular *///ignore
(function () {//ignore
    var name = 'infiniteScrollEx';
    angular.module(name, ['ux'])
        .controller('tabs', function ($scope) {//ignore
            $scope.tab = 'html';//ignore
        })//ignore
        .controller('ctrl', function ($scope, $timeout) {
            var datagrid;
            $scope.add = function(len) {
                var i = 0, items = $scope.items || [];
                while (i < len) {
                    items.push({id: items.length});
                    i += 1;
                }
                $scope.items = items;
            };
            $scope.add(10);
            // listen to the bottom scroll event.
            $scope.$on(ux.datagrid.events.ON_SCROLL_TO_BOTTOM, function () {
                if ($scope.items.length < datagrid.options.infiniteScroll.limit) {
                    // we are doing a timeout here to simulate time that an ajax call may need to get the paginated data.
                    $timeout(function () {
                        $scope.add(10);
                    }, 1000, true);
                }
            });
            $scope.$on(ux.datagrid.events.ON_STARTUP_COMPLETE, function (event, inst) {
                datagrid = inst;
            });
        });
    angular.bootstrap(document.querySelector("*[ng-app='" + name + "']"), [name]);//ignore
}());//ignore
