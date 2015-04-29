/* global angular *///ignore
(function () {//ignore
    var name = 'expandableRow';
    function getName(len) {
        var alpha = 'abcdefghijklmnopqrstuvwxyz', str = '';
        while (str.length < len) {
            str += alpha[Math.floor(Math.random() * alpha.length)];
        }
        return str;
    }
    angular.module(name, ['ux'])
        .controller('tabs', function ($scope) {//ignore
            $scope.tab = 'html';//ignore
        })//ignore
        .controller('ctrl', function ($scope) {
            var i = 0, j, len = 10, items = [], item, childLen = 0;
            while (i < len) {
                item = {id: i, firstName:getName(10), lastName:getName(10), age: Math.floor(Math.random() * 50 + 18), kids: Math.floor(Math.random() * 10)};
                items.push(item);
                i += 1;
            }
            $scope.items = items;
        });
    angular.bootstrap(document.querySelector("*[ng-app='" + name + "']"), [name]);//ignore
}());//ignore
