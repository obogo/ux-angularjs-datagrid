var finder, // there can only be one at a time.
    cmdKey; // if the cmdKey is pressed on a mac.
angular.module('ux').factory('findInList', ['$window', '$compile', function ($window, $compile) {

    return function (exp) {
        var result = {}, term = '', input,
            findInListTemplate = '<div data-ux-datagrid-find-in-list="datagrid" class="findInList"></div>';

        function onKeyDown(event) {
            detectCmdKey(event);
            // we only want to do this if the grid has focus.
            if (exp.element[0].contains(document.activeElement)) {
                if ((event.keyCode == 114) || ((event.ctrlKey || cmdKey) && event.keyCode == 70)) {
                    // Block CTRL + F event
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
                cmdKey = event.type === 'keydown';
                console.log("cmdKey %s", cmdKey ? 'down' : 'up');
            }
        }

        function isCmdKey(event) {
            // if mac we need to check the command key based on each browser because the keycode is different.
            if ($window.navigator.platform === "MacIntel") {
                // chrome/safari left cmd or right cmd key
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
                input = finder[0].getElementsByClassName('findInListInput')[0];
                if (input.select) {
                    input.select();
                }
                input.focus();
                finder.scope().close = removeFinder;
                finder.scope().$digest();
                input.addEventListener('keyup', onInputKeyUp);
            } else {
                removeFinder();
                addFinder();
            }
        }

        function removeFinder() {
            if (finder) {
                var f = finder;
                finder = null; // null this first to prevent recursive loop possibility.
                input.removeEventListener('keyup', onInputKeyUp);
                f.scope().$destroy();
                f.remove();
            }
        }

        function onInputKeyUp() {
            var newTerm = input.value, filtered = [], searchList;
            if (newTerm.indexOf(term) === 0) {
                // the results are an appendage. Search from the list already in memory.
                searchList = filtered;
            } else {
                searchList = exp.getData();
            }
            //TODO: this needs to make sure to keep the indexes of the data in the original list to scroll to them.
            ux.each(searchList, onFilter, filtered);
            term = input.value;
        }

        function onFilter() {

        }

        function setup() {
            // listen for key events to open the find.
            $window.addEventListener('keydown', onKeyDown);
            $window.addEventListener('keyup', onKeyUp);
        }

        result.destroy = function () {
            if (finder) {
                removeFinder();
            }
            $window.removeEventListener('keydown', onKeyDown);
            $window.removeEventListener('keyup', onKeyUp);
            input = null;
            result = null;
        };

        setup();
        exp.findInList = result;

        return exp;
    };
}]);

angular.module('ux').directive('uxDatagridFindInList', function () {

    function countFind(el, index, list, result) {
        if (el === document.activeElement) {
            result.count += 1;
        }
    }

    return {
        restrict: 'A',
        scope: true,
        template: '<input type="text" ng-model="terms" class="findInListInput"><input type="button" class="findInListButton findInListDown" value="&#x25BC;" ng-click="down()"><input type="button" class="findInListButton findInListUp" value="&#x25B2;" ng-click="up()"><input type="button" class="findInListButton findInListClose" value="X" ng-click="close()">',
        link: function (scope, element, attr) {
            var children = element.children();
            // we want this to wait and run after the element is there.
            children.bind('blur', function (event) {
                var result = {count: 0};
                ux.each(children, countFind, result);
                if (!result.count) {
                    scope.close();
                }
            });
        }
    };
});