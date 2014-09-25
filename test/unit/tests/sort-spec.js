/*global describe, beforeEach, afterEach, it, expect, hb */
describe("sort", function () {
    'use strict';
    function asc(a, b) {
        return a > b ? 1 : (b > a ? -1 : 0);
    }

    function desc(a, b) {
        return a > b ? -1 : (b > a ? 1 : 0);
    }

    function complexAsc(a, b) {
        return a.id > b.id ? 1 : (b.id > a.id ? -1 : 0);
    }

    function complexDesc(a, b) {
        return a.id > b.id ? -1 : (b.id > a.id ? 1 : 0);
    }

    var ascAnswer,
        descAnswer,
        ascComplexAnswer,
        descComplexAnswer,
        ary,
        objAry,
        sort = ux.util.array.sort;
    beforeEach(function() {
        ascAnswer = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        descAnswer = ascAnswer.slice(0).reverse();
        ascComplexAnswer = [
            {id:1, index:0},
            {id:2, index:1},
            {id:3, index:2},
            {id:4, index:3},
            {id:5, index:4},
            {id:6, index:5},
            {id:7, index:6},
            {id:8, index:7},
            {id:9, index:8},
            {id:10, index:9},
        ];
        descComplexAnswer = ascComplexAnswer.slice(0).reverse();

        ary = [
            ascAnswer[0],
            ascAnswer[3],
            ascAnswer[2],
            ascAnswer[6],
            ascAnswer[1],
            ascAnswer[8],
            ascAnswer[4],
            ascAnswer[7],
            ascAnswer[9],
            ascAnswer[5]
        ];

        objAry = [
            ascComplexAnswer[0],
            ascComplexAnswer[3],
            ascComplexAnswer[2],
            ascComplexAnswer[6],
            ascComplexAnswer[1],
            ascComplexAnswer[8],
            ascComplexAnswer[4],
            ascComplexAnswer[7],
            ascComplexAnswer[9],
            ascComplexAnswer[5]
        ];
    });

    it("should sort a numeric array asc", function() {
        var a = sort(ary, asc);
        expect(a).toEqual(ascAnswer);
    });

    it("should sort a numeric array desc", function() {
        var a = sort(ary, desc);
        expect(a).toEqual(descAnswer);
    });

    it("should sort a numeric array asc with an object", function() {
        var a = sort(objAry, complexAsc);
        expect(a).toEqual(ascComplexAnswer);
    });

    it("should sort a numeric array desc with an object", function() {
        var a = sort(objAry, complexDesc);
        expect(a).toEqual(descComplexAnswer);
    });

    it("should expect that if 2 items in the array are the same it will not move them when sorting asc", function() {
        var a = sort([{id:4, was:0}, {id:2, was:1}, {id:2, was:2}, {id:3, was:3}, {id:1, was:4}], complexAsc);
        expect(a[1].was).toBe(1);
        expect(a[2].was).toBe(2);
    });

    it("should expect that if 2 items in the array are the same it will reverse them when sorting desc", function() {
        var a = sort([{id:4, was:0}, {id:2, was:1}, {id:2, was:2}, {id:3, was:3}, {id:1, was:4}], complexDesc);
        expect(a[3].was).toBe(1);
        expect(a[2].was).toBe(2);
    });

});