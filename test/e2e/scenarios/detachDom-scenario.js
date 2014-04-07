/*global */
(function () {
    'use strict';

    function scenarios(scenario, scene, find, options, wait, $, assert) {

        var ng = options.window.angular.element;

        function getRow(index) {
            return $('[row-id=' + index + ']');
        }

        function isRowAtTop(index) {
            var el = getRow(index);
            return ng(el).scope().$index == index && el.offset().top <= $('.datagrid').offset().top;
        }

        function scrollToChunk(chunkId, by) {
            by = by || 50;
            find('.datagrid').until("scroll to chunk", function () {
                var c = $("div[chunk-id='" + chunkId + "']"), rowId;
                if (c.length) {
                    rowId = c.attr('range').split(':').shift();
                    ng(this.element[0]).scope().datagrid.scrollModel.scrollToIndex(rowId);
                    return true;
                }
                this.element.scrollTop(this.element.scrollTop() + by);
            });
            wait(250);
        }

        function scrollTo(value, by, immediately) {
            by = by || 50;
            find('.datagrid').until('scrolled to', function () {
                var s = ng(this.element[0]).scope();
                if (immediately) {
                    s.datagrid.element.scrollTop(value);
                    return true;
                }
                if (s.datagrid.values.scroll < value) {
                    if (s.datagrid.values.scroll + by > value) {
                        s.datagrid.scrollModel.scrollTo(value);
                    } else {
                        s.datagrid.scrollModel.scrollTo(s.datagrid.values.scroll + by);
                    }
                } else if (s.datagrid.values.scroll > value) {
                    if (s.datagrid.values.scroll - by < value) {
                        s.datagrid.scrollModel.scrollTo(value);
                    } else {
                        s.datagrid.scrollModel.scrollTo(s.datagrid.values.scroll - by);
                    }
                }
                if (s.datagrid.values.scroll === value) {
                    this.label += " " + value;
                    return true;
                }
                return false;

            }, options.timeouts.medium);
            wait(250); // wait for grid to render.
        }

        function assertChunkTop(label, prevChunkId, chunkId) {
            assert(label, function () {
                var h = $("div[chunk-id='" + prevChunkId + "']").height(),
                    pt = parseInt($("div[chunk-id='" + prevChunkId + "']").css('top'), 10),
                    t = parseInt($("div[chunk-id='" + chunkId + "']").css('top'), 10),
                    offset = pt + h;
                if (offset === t) {
                    return true;
                }
                this.label += ". expected top (" + t + ") of chunk to be (" + offset + ")";
                return false;
            });
        }

        function clickRowAndAssertAllChunkSizeChange(chunkId, rowId) {
            scene("scroll to starting position", function () {
                find('.datagrid').until('scroll to row ' + rowId, function () {
                    var s = ng(this.element[0]).scope();
                    s.datagrid.scrollModel.scrollToIndex(rowId);
                    return true;
                });
                wait(500);
            });

            scene("should expand a row in the first chunk", function ($) {
                var height = find("div[chunk-id='" + chunkId + "']").height();
                getRow(rowId).click();
                wait(500);// wait for transition.
                assert("chunk height is taller.", function () {
                    var h = $("div[chunk-id='" + chunkId + "']").height();
                    this.label += ' (' + height.value + ' to ' + h + ')';
                    return h > height.value;
                });
                scrollTo(0, 0, true);
                wait(1000);
            });

            scene("should scroll down and make sure the first chunk has all child chunks aligned correctly.", function () {
                ux.runner.repeat(function (i) {
                    var pcId = '0.0.0.0.' + i, id = '0.0.0.0.' + (i + 1);
                    assertChunkTop("chunk " + id + " should be aligned correctly.", pcId, id);
                    scrollToChunk(id);
//                    scrollTo(parseInt($("div[chunk-id='" + id + "']").css('top'), 10) + $("div[chunk-id='" + id + "']").height(), 0, true);
                }, 9);
            });

            scene("should scroll down and make sure the parent chunk has all child chunks aligned correctly.", function () {
                ux.runner.repeat(function (i) {
                    var pcId = '0.0.0.' + i, id = '0.0.0.' + (i + 1);
                    assertChunkTop("chunk " + id + " should be aligned correctly.", pcId, id);
                    scrollTo(parseInt($("div[chunk-id='" + id + "']").css('top'), 10) + $("div[chunk-id='" + id + "']").height(), 0, true);
                }, 9);
            });

            scene("should scroll down and make sure the parent chunk has all child chunks aligned correctly.", function () {
                ux.runner.repeat(function (i) {
                    var pcId = '0.0.' + i, id = '0.0.' + (i + 1);
                    assertChunkTop("chunk " + id + " should be aligned correctly.", pcId, id);
                    scrollTo(parseInt($("div[chunk-id='" + id + "']").css('top'), 10) + $("div[chunk-id='" + id + "']").height(), 0, true);
                }, 9);
            });

            scene("should scroll down and make sure the parent chunk has all child chunks aligned correctly.", function () {
                ux.runner.repeat(function (i) {
                    var pcId = '0.' + i, id = '0.' + (i + 1);
                    assertChunkTop("chunk " + id + " should be aligned correctly.", pcId, id);
                    scrollTo(parseInt($("div[chunk-id='" + id + "']").css('top'), 10) + $("div[chunk-id='" + id + "']").height(), 0, true);
                }, 4);
            });
        }

        scenario("ux-datagrid scrolling check", function (goHome) {
            goHome();
            scene("change to detachDom mode", function () {
                options.window.ux.datagrid.options.chunks.detachDom = 10;
            });

//            scene("should load the simple grid example", function () {
//                find("a[href='#/simple']").sendMouse();
//                scrollTo(5000, 50);
//
//                assert("row 125 should be at the top of the viewport.", function () {
//                    return isRowAtTop(125);
//                });
//
//                assert("row 99 should NOT exist", function () {
//                    return getRow(69).length === 0;
//                });
//
//                assert("row 100 should exist", function () {
//                    return getRow(70).length === 1;
//                });
//
//                // chunks that have not been compiled are still there. so chunks still exist
//                // after the grid.
//            });

//            scene("should scroll back up to check that rows before and after the visible area detach", function () {
//                scrollTo(6000, 50); // make sure the next chunk is fully rendered. So it can be detached.
//                scrollTo(2000, 50);
//
//                assert("row 129 should exist", function () {
//                    return getRow(119).length === 1;
//                }, this);
//
//                assert("row 120 should NOT exist", function () {
//                    return getRow(120).length === 0;
//                });
//            });

//            goHome();

            scene("should navigate to expandRows", function () {
                find("a[href='#/addons/expandRows']").sendMouse();
                wait(500);
            });

            clickRowAndAssertAllChunkSizeChange('0.0.0.0.0', 3);
            clickRowAndAssertAllChunkSizeChange('0.0.0.1.5', 154);

            scene("change back to normal mode", function () {
                options.window.ux.datagrid.options.chunks.detachDom = false;
            });
        });
    }

    ux.runner.addScenario('DetachDom Mode', scenarios);

}());