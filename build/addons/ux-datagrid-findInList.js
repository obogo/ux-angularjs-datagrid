/*
* uxDatagrid v.0.2.0
* (c) 2014, WebUX
* License: MIT.
*/
(function(exports, global){
var finder, // there can only be one at a time.
cmdKey;

// if the cmdKey is pressed on a mac.
angular.module("ux").factory("findInList", [ "$window", "$compile", function($window, $compile) {
    return function(exp) {
        var result = {}, term = "", input, lowerCaseTerm, lastFiltered, searchIndex = 0, matchCount, searchIntv, scrollToItemActive = false, itemTexts = {}, findInListTemplate = '<div data-ux-datagrid-find-in-list="datagrid" class="findInList"></div>', templateTexts = {}, workingScope = exp.scope.$new();
        function onKeyDown(event) {
            exp.flow.info("onKeyDown %s", event.keyCode);
            detectCmdKey(event);
            // we only want to do this if the grid has focus.
            if (exp.element[0].contains(document.activeElement)) {
                if (event.keyCode == 114 || (event.ctrlKey || cmdKey) && event.keyCode == 70) {
                    // Block CTRL + F event
                    event.preventDefault();
                    addFinder();
                }
            }
        }
        function onKeyUp(event) {
            exp.flow.info("onKeyUp %s", event.keyCode);
            if (cmdKey) {
                detectCmdKey(event);
            }
        }
        function detectCmdKey(event) {
            exp.flow.info("detectCmdKey");
            if (isCmdKey(event)) {
                cmdKey = event.type === "keydown";
            }
        }
        function isCmdKey(event) {
            exp.flow.info("isCmdKey");
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
        function cloneTextNodes() {
            var ary = [];
            ux.each(this, cloneTextNodeProps, ary);
            return ary;
        }
        function cloneTextNodeProps(textNode, index, list, ary) {
            ary[index] = textNode.slice(0);
            ary[index].text = textNode.text;
        }
        function onGetTemplate(template, index, list, res) {
            var el, textNodes;
            if (!res[template.name]) {
                textNodes = [];
                textNodes.clone = cloneTextNodes;
                el = angular.element(template.template);
                exports.each(el[0].childNodes, findTextNodes, {
                    textNodes: textNodes
                });
                res[template.name] = textNodes;
            }
        }
        function findTextNodes(el, index, childNodes, data) {
            var indexes = data.indexes ? data.indexes.slice(0) : [];
            indexes.push(index);
            if (el.childNodes.length) {
                exports.each(el.childNodes, findTextNodes, {
                    indexes: indexes,
                    textNodes: data.textNodes
                });
            } else if (el.nodeValue) {
                indexes.text = el.nodeValue;
                data.textNodes.push(indexes);
            }
        }
        function addFinder() {
            exp.flow.info("addFinder");
            if (!finder) {
                finder = angular.element(findInListTemplate);
                exp.element[0].parentNode.insertBefore(finder[0], exp.element[0]);
                $compile(finder)(exp.scope);
                input = finder[0].getElementsByClassName("findInListInput")[0];
                if (input.select) {
                    input.select();
                }
                input.focus();
                finder.scope().close = removeFinder;
                exp.safeDigest(finder.scope());
                input.addEventListener("keyup", onInputKeyUp);
                matchCount = finder[0].getElementsByClassName("findInListMatchCount")[0];
                itemTexts = {};
                ux.each(exp.templateModel.getTemplates(), onGetTemplate, templateTexts);
                throttleDoSearch();
            } else {
                removeFinder();
                addFinder();
            }
        }
        function removeFinder() {
            exp.flow.info("removeFinder");
            if (finder) {
                var f = finder;
                itemTexts = null;
                clearHighlights();
                finder = null;
                // null this first to prevent recursive loop possibility.
                input.removeEventListener("keyup", onInputKeyUp);
                f.scope().$destroy();
                f.remove();
            }
        }
        function onInputKeyUp(event) {
            exp.flow.info("onInputKeyUp");
            var newTerm = input.value;
            //TODO: iOS has different key for enter that needs to be added here.
            if (event.keyCode === 13) {
                // enter
                (event.shiftKey ? result.up : result.down)();
            }
            if (event.keyCode === 27) {
                // esc
                result.close();
            }
            if (newTerm === term) {
                return;
            }
            throttleDoSearch();
        }
        function throttleDoSearch() {
            clearTimeout(searchIntv);
            searchIntv = setTimeout(doSearch, 250);
        }
        function doSearch() {
            var searchList = exp.getData(), filtered = [];
            term = input.value;
            //TODO: need to ignore keys that are navigation or special characters.
            //TODO: this needs to make sure to keep the indexes of the data in the original list to scroll to them.
            clearHighlights();
            searchIndex = 0;
            if (term.length) {
                scrollToItemActive = true;
                filtered.absCount = 0;
                lowerCaseTerm = term.toLowerCase();
                ux.each(searchList, onFilter, filtered);
                if (filtered.length) {
                    highlightMatches(filtered);
                }
                lastFiltered = filtered;
                updateMatchCount();
                scrollToItemActive = false;
            }
        }
        function updateMatchCount() {
            if (lastFiltered && lastFiltered.length) {
                matchCount.innerText = searchIndex + 1 + " of " + lastFiltered.length;
            } else {
                matchCount.innerText = "0 of 0";
            }
        }
        function evalTemplateText(item) {
            var tpl = exp.templateModel.getTemplate(item), matches, uncompiledText = templateTexts[tpl.name].clone();
            workingScope[tpl.item] = item;
            //TODO: this can be optimized. Perhaps cache results for a time.
            exports.each(uncompiledText, replaceCompiled, workingScope);
            return uncompiledText;
        }
        function replaceCompiled(textNode, index, list, workingScope) {
            var matches = textNode.text.match(/{{(.*?)}}/g);
            textNode.workingScope = workingScope;
            exports.each(matches, evalMatches, textNode);
            delete textNode.workingScope;
        }
        function evalMatches(value, index, list, textNode) {
            var evalStr = textNode.workingScope.$eval(value.substr(2, value.length - 4));
            textNode.text = textNode.text.replace(value, evalStr);
            list[index] = evalStr;
        }
        function onFilter(item, index, list, filtered) {
            var matches = [];
            // cache itemTexts on an open/close basis.
            if (!itemTexts[index]) {
                itemTexts[index] = evalTemplateText(item);
            }
            exports.each(itemTexts[index], getMatches, matches, filtered);
            if (matches.length) {
                matches.rowIndex = index;
                filtered.push(matches);
            }
        }
        function getMatches(itemText, index, list, itemTextMatches, filtered) {
            var value = itemText.text.toLowerCase(), matchIndex = value.indexOf(lowerCaseTerm, 0), i = 0;
            if (itemTextMatches.absIndex === undefined) {
                // only set it if it has not been. we don't want to overwrite it.
                itemTextMatches.absIndex = filtered.absCount;
            }
            while (matchIndex !== -1) {
                itemTextMatches.push({
                    matchIndex: matchIndex,
                    itemText: itemText,
                    absIndex: filtered.absCount
                });
                matchIndex = value.indexOf(lowerCaseTerm, matchIndex + 1);
                filtered.absCount += 1;
                i += 1;
            }
        }
        function highlightMatches(filtered) {
            var selected;
            ux.each(filtered, highlight);
            selected = filtered.selected;
            if (scrollToItemActive && (selected.rowIndex < exp.values.activeRange.min + 2 || selected.rowIndex > exp.values.activeRange.max - 2)) {
                exp.scrollModel.scrollIntoView(selected.rowIndex, true);
            }
        }
        function highlight(match, index, list) {
            // we need to find all of the matches. And make a selected range. Then highlight those.
            if (match.rowIndex >= exp.values.activeRange.min && match.rowIndex <= exp.values.activeRange.max) {
                var row = exp.getRowElm(match.rowIndex);
                clearHighlightsForRow(match, true);
                exports.each(match, highlightRowMatches, row[0]);
            }
            if (match.absIndex <= searchIndex && searchIndex - match.absIndex < match.length) {
                list.selected = match;
                list.selectedMatchIndex = searchIndex - match.absIndex;
            }
        }
        function highlightRowMatches(match, index, list, row) {
            var node = getNodeFromMatch(row, match);
            //TODO: this needs to check all matches.
            // now we need to highlight the text range inside of the node
            highlightTextRange(node, match, index);
        }
        function getNodeFromMatch(el, match) {
            var depth = 0, len = match.itemText.length, child = el;
            while (depth < len) {
                child = child.childNodes[match.itemText[depth]];
                depth += 1;
            }
            return child;
        }
        function highlightTextRange(el, match, index) {
            //TODO: needs to be injected.
            var range = document.createRange(), selectionContents, span = document.createElement("span"), i = 0, len = 0, startIndex = match.matchIndex, endIndex = match.matchIndex + term.length, siblings = el.parentNode.childNodes;
            while (i < siblings.length - 1) {
                el = siblings[i];
                if (el.childNodes.length) {
                    // these are already matches that have been turned into spans.
                    len = el.childNodes[0].nodeValue ? el.childNodes[0].nodeValue.length : 0;
                } else {
                    len = el.nodeValue ? el.nodeValue.length : 0;
                }
                startIndex -= len;
                endIndex -= len;
                i += 1;
            }
            el = siblings[siblings.length - 1];
            //            if (startIndex >= 0) {
            try {
                range.setStart(el, startIndex);
                range.setEnd(el, endIndex);
            } catch (e) {
                throw new Error("OOPS! Something went wrong with the highlighting!");
            }
            selectionContents = range.extractContents();
            span.appendChild(selectionContents);
            span.className = "uxDatagridFindInListHighlight" + (match.absIndex === searchIndex ? " selectedHighlight" : "");
            range.insertNode(span);
        }
        function clearHighlights() {
            if (lastFiltered) {
                // we want to digest every row that had one.
                ux.each(lastFiltered, clearHighlightsForRow);
                lastFiltered = null;
            }
        }
        function clearHighlightsForRow(match, force) {
            //TODO: We need to clear all. Not just the ones that are in view. or when out of view we need to clear them... maybe before a render we clear them.
            if (force || match.rowIndex >= exp.values.activeRange.min + exp.options.cushion && match.rowIndex <= exp.values.activeRange.max - exp.options.cushion) {
                var row = exp.getRowElm(match.rowIndex)[0];
                exports.each(match, clearHighlightsForRowMatches, row);
            }
        }
        function clearHighlightsForRowMatches(match, index, list, row) {
            var node = getNodeFromMatch(row, match);
            node.parentNode.innerText = match.itemText.text;
        }
        function setup() {
            exp.flow.info("setup");
            // listen for key events to open the find.
            $window.addEventListener("keydown", onKeyDown);
            $window.addEventListener("keyup", onKeyUp);
            // make datagrid focusable so we can have focus in it to find.
            exp.element.attr("tabindex", 999999);
        }
        function updateSearchIndexHighlight() {
            beforeRender();
            afterRender();
        }
        function beforeRender() {
            var filtered = lastFiltered;
            clearHighlights();
            lastFiltered = filtered;
        }
        function afterRender() {
            if (finder && lastFiltered) {
                highlightMatches(lastFiltered);
                updateMatchCount();
            }
        }
        result.up = function up() {
            scrollToItemActive = true;
            if (searchIndex > 0) {
                searchIndex -= 1;
            } else {
                searchIndex = lastFiltered.length - 1;
            }
            updateSearchIndexHighlight();
            scrollToItemActive = false;
        };
        result.down = function down() {
            scrollToItemActive = true;
            if (searchIndex < lastFiltered.length - 1) {
                searchIndex += 1;
            } else {
                searchIndex = 0;
            }
            updateSearchIndexHighlight();
            scrollToItemActive = false;
        };
        result.destroy = function() {
            if (finder) {
                removeFinder();
            }
            $window.removeEventListener("keydown", onKeyDown);
            $window.removeEventListener("keyup", onKeyUp);
            input = null;
            lastFiltered = null;
            matchCount = null;
            workingScope.$destroy();
            workingScope = null;
            result = null;
        };
        setup();
        result.open = addFinder;
        result.close = function() {
            removeFinder();
            exp.element[0].focus();
        };
        exp.findInList = result;
        exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.BEFORE_UPDATE_WATCHERS, beforeRender));
        exp.unwatchers.push(exp.scope.$on(exports.datagrid.events.AFTER_UPDATE_WATCHERS, afterRender));
        return exp;
    };
} ]);

angular.module("ux").directive("uxDatagridFindInList", function() {
    var directiveTerm = "";
    function countFind(el, index, list, result) {
        if (el === document.activeElement) {
            result.count += 1;
        }
    }
    return {
        restrict: "A",
        scope: true,
        template: '<input type="text" ng-model="term" class="findInListInput">' + '<span class="findInListMatchCount"></span>' + '<input type="button" class="findInListButton findInListDown" value="&#x25BC;" ng-click="down()">' + '<input type="button" class="findInListButton findInListUp" value="&#x25B2;" ng-click="up()">' + '<input type="button" class="findInListButton findInListClose" value="X" ng-click="close()">',
        link: function(scope, element, attr) {
            var children = element.children();
            scope.term = directiveTerm;
            // we want this to wait and run after the element is there.
            children.bind("blur", function(event) {
                setTimeout(function() {
                    var result = {
                        count: 0
                    };
                    ux.each(children, countFind, result);
                    if (!result.count) {
                        scope.close();
                    }
                });
            });
            scope.up = function() {
                scope.datagrid.findInList.up();
            };
            scope.down = function() {
                scope.datagrid.findInList.down();
            };
            scope.$watch(function() {
                directiveTerm = scope.term;
            });
        }
    };
});
}(this.ux = this.ux || {}, function() {return this;}()));
