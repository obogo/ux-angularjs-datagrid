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

function createGroupedList(len) {
    var i = 0, group, rand, items = [];
    len = len || records;
    while (i < len) {
        rand = Math.random();
        rand = rand >= 0.8 ? rand : 0;
        if (!group || Math.round(rand)) {
            items.push(group = {
                id: (items.length + 1) + '',
                name: 'Group ' + (items.length + 1),
                _template: 'group',
                children: []
            });
        }
        group.children.push({id: group.id + '.' + group.children.length, children: [], _template: Math.round(Math.random()) ? 'sub' : 'default'});
        i += 1;
    }
    return items;
}

function createGroupedSpreadsheetData(len) {
    var i = 0, group, rand, items = [];
    len = len || records;
    while (i < len) {
        rand = Math.random();
        rand = rand >= 0.8 ? rand : 0;
        if (!group || Math.round(rand)) {
            items.push(group = {
                id: (items.length + 1) + '',
                name: 'Group ' + (items.length + 1),
                _template: 'group',
                children: []
            });
        }
        // note that if this "cols" property was children. It would be added like a regular row because normalization is recursive.
        // it is added as cols because we want to repeat this last section differently.
        group.children.push({id: group.id + '.' + group.children.length, cols: createSimpleList(Math.random() * 10)});
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
        .when('/other/columns', {
            templateUrl: "partials/other/columns.html",
            controller: function ($scope) {
                $scope.name = "Other >> Columns";
                $scope.items = createSimpleList();
            }
        })
        .when('/other/doubleScroll', {
            templateUrl: "partials/other/doubleScroll.html",
            controller: function ($scope) {
                $scope.name = "Other >> Double Scroll";
                $scope.items = createSimpleList();
            }
        })
        .when('/addons/disableHoverWhileScrolling', {
            templateUrl: "partials/addons/disableHoverWhileScrolling.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Desktop >> Disable Hover While Scrolling";
                $scope.items = createSimpleList();
            }
        })
        .when('/addons/gridFocusManager', {
            templateUrl: "partials/addons/gridFocusManager.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Desktop >> Grid Focus Manager";
                $scope.items = createGroupedSpreadsheetData();
            }
        })
        .when('/addons/iosScroll', {
            templateUrl: "partials/addons/iosScroll.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Touch >> ISO >> Scroll Friction";
                $scope.items = createSimpleList(100);
            }
        })
        .when('/addons/expandRows', {
            templateUrl: "partials/addons/expandRows.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Expand Rows";
                $scope.items = createGroupedList();
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
                });
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
        angular.element(datagrid).scope().datagrid.scrollModel.scrollTo(angular.element(datagrid[0]).children()[0].offsetHeight * percent);
    };

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
        template: '<div>{{count}} of {{len}} rows compiled ({{percent}}%) scroll {{scrollPercent}}%</div>',
        link: function (scope, element, attr) {
            scope.percent = 0;
            var onProgress = function (event, percent) {
                scope.count = percent.count;
                scope.len = percent.len;
                scope.percent = Math.round((percent.count / percent.len) * 100);
                safeDigest();
                angular.element(element[0].childNodes[0]).css({width: scope.percent + '%', overflow: 'visible', whiteSpace:'nowrap'});
            };

            var onScroll = function () {
                scope.scrollPercent = scope.scrollPercent = grid().values.scrollPercent;
                safeDigest();
            };

            var safeDigest = function () {
                if (!scope.$$phase) {
                    scope.$digest();
                }
            };
            scope.$root.$on(ux.datagrid.events.RENDER_PROGRESS, onProgress);
            scope.$root.$on(ux.datagrid.events.ON_SCROLL, onScroll);
        }
    }
});