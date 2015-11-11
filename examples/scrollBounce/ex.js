/* global angular *///ignore
(function () {//ignore
    var name = 'scrollBounceEx';
    angular.module(name, ['ux'])
        .controller('tabs', function ($scope) {//ignore
            $scope.tab = 'html';//ignore
        })//ignore
        .controller('ctrl', function ($scope) {
            $scope.add = function (len) {
                var i = 0, items = $scope.items || [];
                while (i < len) {
                    items.push({id: items.length});
                    i += 1;
                }
                $scope.items = items;
            };
            $scope.add(50);
        });
    var el = document.querySelector("*[ng-app='" + name + "']"), strapped = false;//ignore
    window.addEventListener('scroll', function () {//ignore
        if (!strapped && hb.isElementInViewport(el)) {//ignore
            strapped = true;
            angular.bootstrap(el, [name]);//ignore
        }//ignore
    });//ignore
}());//ignore
