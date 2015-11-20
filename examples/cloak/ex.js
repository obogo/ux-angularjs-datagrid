/* global angular *///ignore
(function () {//ignore
    var name = 'cloak';
    angular.module(name, ['ux'])
        .controller('tabs', function ($scope) {//ignore
            $scope.tab = 'html';//ignore
        })//ignore
        .controller('ctrl', function ($scope) {
            var i = 0, len = 1000, items = [];
            while (i < len) {
                items.push({id: i});
                i += 1;
            }
            $scope.items = items;
        });
    var el = document.querySelector("*[ng-app='" + name + "']"), strapped = false;//ignore
    window.addEventListener('scroll', function () {//ignore
        if (!strapped && hb.isElementInViewport(el)) {//ignore
            strapped = true;
            angular.bootstrap(el, [name]);//ignore
        }//ignore
    });//ignore
}());//ignore
