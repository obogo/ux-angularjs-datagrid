/* global angular */
var app = angular.module('app', ['ux']);
app.directive('main', function ($log) {
    return {
        link: function (scope) {
            scope.log = $log.log;
        }
    };
})
    .controller('ex', function($scope) {
        $scope.tab = 'html';
    })
    .controller('ex1Ctrl', function($scope) {
        var i = 0, len = 100, items = [];
        while (i < len) {
            items.push({id:i});
            i += 1;
        }
        $scope.items = items;
    });