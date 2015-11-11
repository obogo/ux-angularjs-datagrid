/* global angular *///ignore
(function () {//ignore
    var name = 'spreadSheet';

    angular.module(name, ['ux'])
        .controller('tabs', function ($scope) {//ignore
            $scope.tab = 'html';//ignore
        })//ignore
        .controller('ctrl', function ($scope) {
            // we are going to create some grouped data. Array of items with .children arrays of items.
            // top level items become the group headers, the children items become the rows.
            var i, j, len = 10, items = [], row, columns = ['A', 'B', 'C', 'D'], jlen = columns.length;
            for (i = 0; i < len; i += 1) {
                row = {};
                for (j = 0; j < jlen; j += 1) {
                    row[columns[j]] = '';
                }
                items.push(row);
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
