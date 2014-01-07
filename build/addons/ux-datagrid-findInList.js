/*
* uxDatagrid v.0.1.0
* (c) 2014, WebUX
* License: MIT.
*/
(function(exports, global){
var finder, cmdKey;

angular.module("ux").factory("findInList", [ "$window", "$compile", function($window, $compile) {
    return function(exp) {
        var result = {}, term = "", input, findInListTemplate = '<div data-ux-datagrid-find-in-list="datagrid" class="findInList"></div>';
        function onKeyDown(event) {
            detectCmdKey(event);
            if (exp.element[0].contains(document.activeElement)) {
                if (event.keyCode == 114 || (event.ctrlKey || cmdKey) && event.keyCode == 70) {
                    event.preventDefault();
                    addFinder();
                }
            }
        }
        function onKeyUp(event) {
            if (cmdKey) {
                detectCmdKey(event);
            }
        }
        function detectCmdKey(event) {
            if (isCmdKey(event)) {
                cmdKey = event.type === "keydown";
                console.log("cmdKey %s", cmdKey ? "down" : "up");
            }
        }
        function isCmdKey(event) {
            if ($window.navigator.platform === "MacIntel") {
                if ($window.navigator.userAgent.match(/(Chrome|Safari)/i) && event.keyCode === 91 || event.keyCode === 93) {
                    return true;
                }
                if (window.navigator.userAgent.match(/Firefox/i) && event.keyCode === 224) {
                    return true;
                }
                if (window.navigator.userAgent.match(/Opera/i) && event.keyCode === 17) {
                    return true;
                }
            }
            return false;
        }
        function addFinder() {
            if (!finder) {
                finder = angular.element(findInListTemplate);
                exp.element.append(finder);
                $compile(finder)(exp.scope);
                input = finder[0].getElementsByClassName("findInListInput")[0];
                if (input.select) {
                    input.select();
                }
                input.focus();
                finder.scope().close = removeFinder;
                finder.scope().$digest();
                input.addEventListener("keyup", onInputKeyUp);
            } else {
                removeFinder();
                addFinder();
            }
        }
        function removeFinder() {
            if (finder) {
                var f = finder;
                finder = null;
                input.removeEventListener("keyup", onInputKeyUp);
                f.scope().$destroy();
                f.remove();
            }
        }
        function onInputKeyUp() {
            var newTerm = input.value, filtered = [], searchList;
            if (newTerm.indexOf(term) === 0) {
                searchList = filtered;
            } else {
                searchList = exp.getData();
            }
            ux.each(searchList, onFilter, filtered);
            term = input.value;
        }
        function onFilter() {}
        function setup() {
            $window.addEventListener("keydown", onKeyDown);
            $window.addEventListener("keyup", onKeyUp);
        }
        result.destroy = function() {
            if (finder) {
                removeFinder();
            }
            $window.removeEventListener("keydown", onKeyDown);
            $window.removeEventListener("keyup", onKeyUp);
            input = null;
            result = null;
        };
        setup();
        exp.findInList = result;
        return exp;
    };
} ]);

angular.module("ux").directive("uxDatagridFindInList", function() {
    function countFind(el, index, list, result) {
        if (el === document.activeElement) {
            result.count += 1;
        }
    }
    return {
        restrict: "A",
        scope: true,
        template: '<input type="text" ng-model="terms" class="findInListInput"><input type="button" class="findInListButton findInListDown" value="&#x25BC;" ng-click="down()"><input type="button" class="findInListButton findInListUp" value="&#x25B2;" ng-click="up()"><input type="button" class="findInListButton findInListClose" value="X" ng-click="close()">',
        link: function(scope, element, attr) {
            var children = element.children();
            children.bind("blur", function(event) {
                var result = {
                    count: 0
                };
                ux.each(children, countFind, result);
                if (!result.count) {
                    scope.close();
                }
            });
        }
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
