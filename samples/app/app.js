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

function createSimpleFieldList(len, offset, fields) {
    var i = 0, j, items = createSimpleList(len, offset);
    function makeWord(len) {
        var r = '', s = 'abcdefghijklmnopqrstuvwxyz', slen = s.length;
        len = len || 1;// no 0 length words.
        while (r.length < len) {
            r += s.charAt(Math.floor(Math.random() * slen));
        }
        return r;
    }
    function createWords(numOfWords) {
        var words = [];
        while (words.length < numOfWords) {
            words.push(makeWord(Math.floor(Math.random() * 10)));
        }
        return words.join(' ');
    }
    // now we go through each one and add fields.
    while (i < len) {
        for (j in fields) {
            items[i][j] = typeof fields[j] === 'object' ? fields[j][Math.floor(Math.random() * fields[j].length)] : createWords(fields[j]);
        }
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
                $scope.clear = function () {
                    $scope.items = [];
                };
                $scope.reset = function () {
                    $scope.items = createSimpleList();
                };
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
        .when('/other/templateData', {
            templateUrl: "partials/other/templateData.html",
            controller: function ($scope) {
                $scope.name = "Other >> Template Data";
                $scope.items = createSimpleList();
                $scope.templates = [
                    {
                        template: '<div class="row"><div>{{item.id}}</div></div>',
                        name: 'default',
                        item: 'item',
                        base: null
                    }
                ];
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
        .when('/addons/iScrollAddon', {
            templateUrl: "partials/addons/iScrollAddon.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Touch >> IScroll";
                $scope.items = createSimpleList(100);
            }
        })
        .when('/addons/collapsibleGroups', {
            templateUrl: "partials/addons/collapsibleGroups.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Collapsible Groups";
                $scope.items = createGroupedList();
            }
        })
        .when('/addons/expandRows', {
            templateUrl: "partials/addons/expandRows.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Expand Rows";
                $scope.items = createGroupedList();
            }
        })
        .when('/addons/findInList', {
            templateUrl: "partials/addons/findInList.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Find In List";
                $scope.items = createSimpleFieldList(1000, 0, {name: 1, description: ['redish yellow grey','greenish orange','bluish blurbl'], type:['red','green','blue'], weight: [0.1, 0.2, 0.3, 0.4, 0.5]});
            }
        })
        .when('/addons/logging', {
            templateUrl: "partials/addons/logging.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Grid Logger";
                $scope.items = createSimpleList();
            }
        })
        .when('/addons/scrollBounce', {
            templateUrl: "partials/addons/scrollBounce.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Scroll Bounce";
                $scope.items = createSimpleList(200);
            }
        })
        .when('/addons/scrollHistory', {
            templateUrl: "partials/addons/scrollHistory.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Scroll History Model";
                $scope.items = createSimpleList();
            }
        })
        .when('/addons/sortModel', {
            templateUrl: "partials/addons/sortModel.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Sort Model";
                $scope.items = createSimpleFieldList(100, 0, {name: 1, description: 10, type:['red','green','blue'], weight: [0.1, 0.2, 0.3, 0.4, 0.5]});
            }
        })
        .when('/addons/sortModelServer', {
            templateUrl: "partials/addons/sortModelServer.html",
            controller: function ($scope) {
                $scope.name = "Addons >> Sort Model Server";
                $scope.items = createSimpleFieldList(100, 0, {name: 1, description: 10, type:['red','green','blue'], weight: [0.1, 0.2, 0.3, 0.4, 0.5]});
                $scope.$on(ux.datagrid.events.ON_BEFORE_SORT, function (event, key) {
                    if (!grid().sortModel.getCache(key)) {
                        grid().sortModel.setCache(key, []);
                        // let's wait to simulate a server call. Then let's change the color of the data
                        // to verify that it works.
                        setTimeout(function () {
                            var colors = ['red','green','blue'];
                            if (key.indexOf('name') !== -1) {
                                colors = ['orange','yellow','red'];
                            } else if (key.indexOf('description') !== -1) {
                                colors = ['sky blue','teal','blue'];
                            } else if (key.indexOf('id') !== -1) {
                                colors = ['light green','green','dark green'];
                            } else if (key.indexOf('type') !== -1) {
                                colors = ['white','grey','black'];
                            } else if (key.indexOf('weight') !== -1) {
                                colors = ['purple','violet','lavender'];
                            }
                            grid().sortModel.setCache(key, createSimpleFieldList(100, 0, {name: 1, description: 10, type:colors, weight: [0.1, 0.2, 0.3, 0.4, 0.5]}))
                            $scope.$apply();
                        }, 1000);
                    }
                });
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
                $scope.$on(ux.datagrid.events.ON_SCROLL_TO_BOTTOM, function () {
                    if ($scope.items.length < grid().options.infiniteScroll.limit) {
                        // we are doing a timeout here to simulate time that an ajax call may need to get the paginated data.
                        $timeout(function () {
                            $scope.items = $scope.items.concat(createSimpleList(20, $scope.items.length));
                        }, 1000, true);
                    }
                });
            }
        })
        .when('/addons/memoryOptimizer', {
            templateUrl: "partials/addons/memoryOptimizer.html",
            controller: function SimpleCtrl($scope) {
                $scope.name = "Memory Optimizer";
                $scope.items = createSimpleList();
                $scope.clear = function () {
                    $scope.items = [];
                };
                $scope.reset = function () {
                    $scope.items = createSimpleList();
                };
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
//    setInterval(function () {
//        $scope.counter += 1;
//        if (!$scope.$$phase) {
//            $scope.$apply();
//        }
//    }, 1000);

    $scope.scrollToPercent = function (percent) {
        var datagrid = document.getElementsByClassName('datagrid');
        angular.element(datagrid).scope().datagrid.scrollModel.scrollTo(angular.element(datagrid[0]).scope().datagrid.getContentHeight() * percent);
    };

    $scope.create = function () {

    };
});

/**
 * this is the progress bar showing how many of the rows are rendered.
 */
angular.module('progress', ['ng']).directive('progressBar', function ($rootScope) {
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
            $rootScope.$on(ux.datagrid.events.ON_RENDER_PROGRESS, onProgress);
            $rootScope.$on(ux.datagrid.events.ON_SCROLL, onScroll);
        }
    }
});