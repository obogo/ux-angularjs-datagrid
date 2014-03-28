function loadFrame(url) {
    $(".frameContainer").append('<iframe id="targetFrame" src="' + url + '" onload="pointToFrame()"></iframe>');
    $('#targetFrame').css(ux.runner.options.frame);
}

function pointToFrame() {
    if (!pointed) {
        pointed = true;
        var win = $('#targetFrame')[0].contentWindow, angularRoot = win.angular.element(win.document);
        ux.runner.options.window = win;
        ux.runner.options.rootElement = angularRoot;
        ux.selector.config.doc = win.document;
        angular.element(document).injector().get('$rootScope').$broadcast('pointerReady');
    }
}

angular.module('app', ['ux']).
    controller('root', function root($scope) {
        'use strict';
        $scope.start = function start() {
            ux.runner.run.apply(ux.runner, arguments);
        };
        $scope.$on('pointerReady', function () {
            $scope.scenarios = ux.runner.getScenarioNames();
            $scope.descriptions = ux.runner.describeScenarios(function (descriptions, length) {
                $scope.len = length;
                $scope.$apply();
            });
        });
    })
    .run();