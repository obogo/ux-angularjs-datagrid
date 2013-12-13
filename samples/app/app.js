var app = angular.module('app', ['ngRoute', 'ux', 'progress']), records = 50000;

function createSimpleList(len, offset) {
    var i, items = [];
    len = len || records;
    i = offset || 0;
    len += i;
    while (i < len) {
        items.push({id: i});
        i += 1;
    }
    return items;
}

function createGroupedList() {
    var i = 0, len = records, group, rand, items = [];
    while (i < len) {
        rand = Math.random();
        rand = rand >= 0.8 ? rand : 0;
        if (!group || Math.round(rand)) {
            items.push(group = {
                id: 'G' + (items.length + 1),
                name: 'Group ' + (items.length + 1),
                _template: 'group',
                children: []
            });
        }
        group.children.push({id: 'I' + group.children.length + 1, children: [], _template: Math.round(Math.random()) ? 'sub' : 'default'});
        i += 1;
    }
    return items;
}

app.config(function ($routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl: "partials/home.html",
            controller: function HomeCtrl($scope) {
                $scope.name = 'Home';
            }
        })
        .when('/simple', {
            templateUrl: "partials/simple.html",
            controller: function SimpleCtrl($scope) {
                $scope.name = "Simple Example";
                $scope.items = createSimpleList();
            }
        })
        .when('/grouped', {
            templateUrl: "partials/grouped.html",
            controller: function ($scope) {
                $scope.name = "Grouped Example";
                $scope.items = createGroupedList();
            }
        })
        .when('/addons/disableHoverWhileScrolling', {
            templateUrl: "partials/addons/disableHoverWhileScrolling.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Desktop >> Disable Hover While Scrolling";
                $scope.items = createSimpleList();
            }
        })
        .when('/addons/iosScrollFriction', {
            templateUrl: "partials/addons/iosScrollFriction.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Touch >> ISO >> Scroll Friction";
                $scope.items = createSimpleList();
            }
        })
        .when('/addons/statsModel', {
            templateUrl: "partials/addons/statsModel.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Touch >> Stats Model";
                $scope.items = createSimpleList();
                $scope.$on(ux.datagrid.events.STATS_UPDATE, function (event, result) {
                    $scope.stats = result;
                    $scope.$digest();
                });
            }
        })
        .when('/addons/infiniteScroll', {
            templateUrl: "partials/addons/infiniteScroll.html",
            controller: function ($scope, $timeout) {
                $scope.name = "Addons >> InfiniteScroll";
                $scope.items = createSimpleList(20);
                $scope.$on(ux.datagrid.events.SCROLL_TO_BOTTOM, function () {
                    if ($scope.items.length < $scope.datagrid.options.infiniteScrollLimit) {
                        // we are doing a timeout here to simulate time that an ajax call may need to get the paginated data.
                        $timeout(function () {
                            $scope.items = $scope.items.concat(createSimpleList(20, $scope.items.length));
                        }, 1000, true);
                    }
                })
            }
        })
        .otherwise({
            redirectTo: '/'
        });
});

app.controller('root', function root($scope) {
    $scope.counter = 0;
    $scope.records = records;
    $scope.percents = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    setInterval(function () {
        $scope.counter += 1;
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    }, 1000);

    $scope.scrollToPercent = function (percent) {
        var datagrid = document.getElementsByClassName('datagrid');
        datagrid[0].scrollTop = angular.element(datagrid[0]).children()[0].offsetHeight * percent;
    }

    $scope.create = function () {

    };
});

/**
 * this is the progress bar showing how many of the rows are rendered.
 */
angular.module('progress', ['ng']).directive('progressBar', function () {
    return {
        restrict: 'A',
        scope: true,
        template: '<div>{{percent}}%</div>',
        link: function (scope, element, attr) {
            scope.percent = 0;
            var onProgress = function (event, percent) {
                scope.percent = Math.round(percent * 100);
                if (!scope.$$phase) {
                    scope.$digest();
                }
                angular.element(element[0].childNodes[0]).css({width: (percent * 100) + '%', overflow: 'visible'});
            };
            scope.$root.$on(ux.datagrid.events.RENDER_PROGRESS, onProgress);
        }
    }
});