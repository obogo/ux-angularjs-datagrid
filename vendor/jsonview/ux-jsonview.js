/* global angular */
(function () {
    'use strict';

    var template = '<ul class="jsonTree">' +
        '<li ng-repeat="(nodeLabel, nodeValue) in jsonData track by nodeLabel" json-node="node">' +

        // disclosure
        '<i class="collapsed" ng-show="desc.hasChildren && !desc.children"' +
        'ng-click="toggleExpand(desc)"></i>' +
        '<i class="expanded" ng-show="desc.hasChildren && desc.children"' +
        'ng-click="toggleExpand(desc)"></i>' +
        '<i class="normal" ng-hide="desc.hasChildren"></i>' +

        // value
        '<div ng-switch="desc.type" class="node" ng-class="desc.selected"' +
        'ng-mouseup="toggleExpand(desc)" ng-mousedown="select(desc)">' +

        '<span class="node-label" ng-bind="nodeLabel"></span>:' +

        '<div style="display: inline-block" ng-switch-when="array">' +
        'Array[{{desc.data.length}}]</div>' +
        '<div style="display: inline-block" ng-switch-when="object">' +
        '{{desc.className}}' +
        '</div>' +
        '<div style="display: inline-block" ng-switch-when="string">' +
        '<span class="node-string">"{{nodeValue}}"</span>' +
        '</div>' +
        '<div style="display: inline-block" ng-switch-when="bool">' +
        '<span class="node-bool">{{nodeValue}}</span>' +
        '</div>' +
        '<div style="display: inline-block" ng-switch-when="number">' +
        '<span class="node-number">{{nodeValue}}</span>' +
        '</div>' +
        '<div style="display: inline-block" ng-switch-when="null">' +
        '<span class="node-null">null</span>' +
        '</div>' +
        '<div style="display: inline-block" ng-switch-when="undefined">' +
        '<span class="node-undefined">undefined</span>' +
        '</div>' +
        '</div>' +
        '<span ng-if="opts.showPaths" ng-bind="desc.path" style="font-weight: normal;color: #BBBBBB"></span>' +
        '<div ux-jsonview ng-model="desc.children"></div>' +
        '</li>' +
        '</ul>';

    var module;
    try {
        module = angular.module('ux');
    } catch(e) {
        module = angular.module('ux', []);
    }

    module.directive('jsonNode', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var val = scope.nodeValue, item = {};
                if (angular.isArray(val)) {
                    item.type = 'array';
                    item.hasChildren = true;
                    item.data = val;
                } else if (angular.isObject(val)) {
                    item.type = 'object';
                    item.hasChildren = true;
                    item.data = val;
                    item.className = val.constructor.name;
                } else if (angular.isString(val)) {
                    item.type = 'string';
                } else if (val === true || val === false) {
                    item.type = 'bool';
                } else if (angular.isNumber(val)) {
                    item.type = 'number';
                } else if (val === null) {
                    item.type = 'null';
                } else if (val === undefined) {
                    item.type = 'undefined';
                }

                function getPath() {
                    var path = '', currentScope = scope;
                    path = [];
                    if (currentScope.path) {
                        return currentScope.path;
                    }
                    while (currentScope && currentScope.nodeLabel !== undefined) {
                        if (angular.isNumber(currentScope.nodeLabel)) {
                            path.push('[' + currentScope.nodeLabel + ']');
                        } else {
                            path.push(currentScope.nodeLabel);
                        }
                        currentScope = currentScope.$parent.$parent; // jump 2 scopes because directive and template
                    }
                    path.push(scope.nodeSrc);
                    path.reverse();
                    return path.join('.').replace(/\.(\[\d+\])/gim, "$1");
                }

                item.path = getPath();
                scope.desc = item;

                scope.refresh = function () {
                    if (item.data) {
                        var data = scope.$eval(item.path);
                        if (data + '' !== 'NaN') {
                            item.data = data;
                            if (item.children) {
                                item.children = data;
                            }
                        }
                    }
                };

                scope.$on('updateNode', function () {
                    scope.refresh();
                });
            }
        };
    });

    module.directive('uxJsonview', ['$compile', function ($compile) {
        return {
            require: 'ngModel',
            restrict: 'A',
            scope: true,
            link: function (scope, element, attrs) {

                if (!scope.initted) {
                    scope.initted = true;

                    scope.nodeSrc = attrs.ngModel;

                    scope.template = template;

                    scope.toggleExpand = function (node) {
                        if (node.hasChildren) {
                            if (node.children) {
                                node.children = null;
                            } else {
                                node.children = node.data;
                            }
                        }
                    };

                    scope.select = function (node) {
                        if (scope.activeNode && scope.activeNode.selected) {
                            scope.activeNode.selected = undefined;
                        }
                        node.selected = 'selected';
                        scope.activeNode = node;
                    };

                    scope.$watch(attrs.uxJsonview, function(opts){
                        scope.opts = opts;
                    });
                }

                scope.$watch(attrs.ngModel, function (data) {
                    scope.jsonData = data;
                    scope.$broadcast('updateNode');
                }, true);

                element.html('').append($compile(scope.template)(scope));
            }
        };
    }]);
}());

