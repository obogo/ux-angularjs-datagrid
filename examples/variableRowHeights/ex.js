/* global angular *///ignore
(function () {//ignore
    // requires ux-datagrid 1.4.0+
    var name = 'variableRowHeights';

    var abc = 'abcdefghijklmnopqrstuvwxyz';
    var spacing = 4;
    var period = 20;

    function randomOf(val) {
        return Math.round((Math.random() * val)) % val === 0;
    }

    function randomLetter() {
        return abc[Math.floor(Math.random() * abc.length)];
    }

    function makeStr(len) {
        var str = '';
        while(str.length < len) {
            str += randomLetter();
            str += randomOf(spacing) ? ' ' : '';
            str += randomOf(period) ? '. ' + randomLetter().toUpperCase() : '';
        }
        return str;
    }

    angular.module(name, ['ux'])
        .controller('tabs', function ($scope) {//ignore
            $scope.tab = 'html';//ignore
        })//ignore
        .controller('ctrl', function ($scope) {
            var i = 0, len = 1000, items = [], overrideHeights = {};
            while (i < len) {
                items.push({id: i, desc: makeStr(Math.random() * 500)});
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
