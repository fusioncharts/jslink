/**
 * @fileOverview
 * This file contains all test specs for the library functions of this tool.
 */

/* global describe, it, expect */
describe("library module", function () {
    var lib = require("../src/lib.js");

    describe ("`lib.plural`", function () {
        it ("must exist", function () {
            expect(lib.plural).toBeOfType("function");
        });

        it ("plural must return exact word when count is between -1 or 1 (inclusive)", function () {
            expect(lib.plural(1, "word")).toBe("1 word");
            expect(lib.plural(0, "word")).toBe("0 word");
            expect(lib.plural(0.5, "word")).toBe("0.5 word");
            expect(lib.plural(-0.5, "word")).toBe("-0.5 word");
            expect(lib.plural(-1, "word")).toBe("-1 word");
        });

        it ("plural must return the word suffixed with 's' when count is not between -1 or 1", function () {
            expect(lib.plural(1e55, "word")).toBe("1e+55 words");
            expect(lib.plural(11, "word")).toBe("11 words");
            expect(lib.plural(1.1, "word")).toBe("1.1 words");
            expect(lib.plural(-1.1, "word")).toBe("-1.1 words");
            expect(lib.plural(-11, "word")).toBe("-11 words");
        });

        it ("must not fail on invalid parameters", function () {
            expect(lib.plural(10)).toBe("10 undefineds");
            expect(lib.plural()).toBe("undefined undefined");
            expect(lib.plural(NaN)).toBe("NaN undefined");
        });
    });

    describe("lib.format", function() {
        it ("format must exist", function () {
            expect(lib.format).toBeOfType("function");
        });

        it ("format must return the same variable in case of non string variable", function () {
            expect(lib.format([], [])).toEqual([]);
            expect(lib.format({}, [])).toEqual({});

            expect(lib.format(null, [])).toBe("");
            expect(lib.format(undefined, [])).toBe("");
        });

        it("format must replace correctly in case of args array passed or if passed as arguments", function () {
            expect(lib.format("{0}Two{1}Four{2}", ["One", "Three", "Five"])).toBe("OneTwoThreeFourFive");
            expect(lib.format("{0}Two{2}Four{1}", ["One", "Three", "Five"])).toBe("OneTwoFiveFourThree");
            expect(lib.format("{0}Two{1}Four{2}", "One", [], "Five")).toBe("OneTwoFourFive");
            expect(lib.format("{0}Two{1}Four{1}", "One", "Three", "Five")).toBe("OneTwoThreeFourThree");
        });

        it ("format must replace null argument(s with empty string", function () {
            expect(lib.format("{0}{1}{2}", "One", null, "Two")).toBe("OneTwo");
            expect(lib.format("{0}{1}{2}", null, null, null)).toBe("");
        });

        it("fewer Arguments or falsy values(except null) must not be made empty strings", function() {
            expect(lib.format("{0}{1}{2}", "One", undefined, "Two")).toBe("OneundefinedTwo");
            expect(lib.format("{0}{1}{2}", undefined, {}, false)).toBe("undefined[object Object]false");
            expect(lib.format("{0}{1}{2}", [undefined])).toBe("undefinedundefinedundefined");
 
        });

        it("No args must return the unformatted object", function() {
            expect(lib.format("{0}{1}{2}", [])).toBe("{0}{1}{2}");
            expect(lib.format("{0}{1}{2}")).toBe("{0}{1}{2}");

            expect(lib.format([])).toEqual([]);
            expect(lib.format({})).toEqual({});

            expect(lib.format(null)).toBe("");
            expect(lib.format(undefined)).toBe("");
        });
    });

    describe("`lib.stringLike", function () {
        it ("must exist", function () {
            expect(lib.stringLike).toBeOfType("function");
        });

        it ("must allow non string objects as parameter that can be converted to string", function () {
            expect(lib.stringLike({})).toBe("[object Object]");
            expect(lib.stringLike(["a", "b"])).toBe("a,b");
        });

        it ("must not accept objects that cannot be converted to string", function () {
            expect(function () {
                lib.stringLike(NaN);
            }).toThrow(new TypeError("Not a valid string: NaN"));

            expect(function () {
                lib.stringLike(null);
            }).toThrow(new TypeError("Not a valid string: null"));

            expect(function () {
                lib.stringLike(undefined);
            }).toThrow(new TypeError("Not a valid string: undefined"));
        });

        it ("must accept blank string", function () {
            expect(lib.stringLike("")).toBe("");
        });

        it ("must trim the incoming string", function () {
            expect(lib.stringLike(" ")).toBe("");
            expect(lib.stringLike(" test")).toBe("test");
            expect(lib.stringLike("  test")).toBe("test");
            expect(lib.stringLike("test ")).toBe("test");
            expect(lib.stringLike("test  ")).toBe("test");
            expect(lib.stringLike(" test ")).toBe("test");
            expect(lib.stringLike("  test  ")).toBe("test");
        });
    });

    describe("lib.copy", function() {

        it ("lib.copy function must exist", function() {
            expect(lib.copy).toBeOfType("function");
        });
        
        it("must throw an error in case sink is not a valid object", function() {
            expect(function () {
                lib.copy(null, {});
            }).toThrow(new TypeError("Not a valid Object"));

            expect(function () {
                lib.copy(undefined, {});
            }).toThrow(new TypeError("Not a valid Object"));

            expect(function () {
                lib.copy(NaN, {});
            }).toThrow(new TypeError("Not a valid Object"));

            expect(function () {
                lib.copy(5, {});
            }).toThrow(new TypeError("Not a valid Object"));

            expect(function () {
                lib.copy("", {});
            }).toThrow(new TypeError("Not a valid Object"));

            expect(function () {
                lib.copy(true, {});
            }).toThrow(new TypeError("Not a valid Object"));
        });

        it("Every property from source to sink must have been copied", function() {
            var sink,
                source;

            sink =  {
                a: 1, 
                b: 3
            };

            source = {
                a: 5,
                b: {
                    a: 5
                }
            };

            lib.copy(sink, source);
            for (var key in source) {
                expect(sink[key]).toEqual(source[key]);
            }
        });
    });

    describe("lib.argsArray2Object", function() {
        it ("argsArray2Object function must exist", function() {
            expect(lib.copy).toBeOfType("function");
        });

        it("must convert an args array into an object", function() {
            expect(lib.argsArray2Object(["--test", "--abc"])).toEqual({
                test: true,
                abc: true
            });

            expect(lib.argsArray2Object(["--test=chart", "--abc"])).toEqual({
                test: "chart",
                abc: true
            });

            expect(lib.argsArray2Object(["--test=chart", "--abc", "--test=charts"])).toEqual({
                test: ["chart", "charts"],
                abc: true
            });

        });

        it("must use the default option name in case of not an option object", function(){
            expect(lib.argsArray2Object(["test"], "opt")).toEqual({
                opt: "test"
            });

            expect(lib.argsArray2Object(["test", "abc"], "opt")).toEqual({
                opt: ["test", "abc"]
            });
            //Empty object is expected in case of no optional arguments and default option
            expect(lib.argsArray2Object(["test", "abc"])).toEqual({});
        });
    });

    describe("lib.isUnixHiddenPath", function() {
        it("isUnixHiddenPath function must be there in lib", function() {
            expect(lib.isUnixHiddenPath).toBeOfType("function");
        });

       /* it("current folder and parent folder should be hidden paths", function() {
            expect(lib.isUnixHiddenPath(".")).toBe(true);
            expect(lib.isUnixHiddenPath("..")).toBe(true);
        });*/

        it("hidden files and folders should be hidden paths", function () {
            expect(lib.isUnixHiddenPath(".abc/")).toBe(true);
            expect(lib.isUnixHiddenPath(".a.out")).toBe(true);
            expect(lib.isUnixHiddenPath(".a/b")).toBe(true);
            expect(lib.isUnixHiddenPath(".a/b/c.out")).toBe(true);
            expect(lib.isUnixHiddenPath("a/b/.out")).toBe(true);
            expect(lib.isUnixHiddenPath("a/b/.o.ut")).toBe(true);
        });  

        it("Following paths should not be hidden paths", function () {
            expect(lib.isUnixHiddenPath("abc/")).toBe(false);
            expect(lib.isUnixHiddenPath("a.out")).toBe(false);
            expect(lib.isUnixHiddenPath("a/b")).toBe(false);
            expect(lib.isUnixHiddenPath("a/b/c.out")).toBe(false);
            expect(lib.isUnixHiddenPath("a/b/out")).toBe(false);
        });    
    });

    describe("lib.isUnixDirectory", function() {
        it("isUnixDirectory function must be there in lib", function () {
            expect(lib.isUnixDirectory).toBeOfType("function");
        });

        it("current folder and parent folder are directories", function () {
            expect(lib.isUnixDirectory(".")).toBe(true);
            expect(lib.isUnixDirectory("..")).toBe(true);
        });

        it("Following paths should be directory paths", function () {
            expect(lib.isUnixDirectory(".abc/")).toBe(true);
            expect(lib.isUnixDirectory(".a/b/")).toBe(true);
            expect(lib.isUnixDirectory("a/b/")).toBe(true);
            expect(lib.isUnixDirectory("a/b.c/")).toBe(true);
        });

        it("Following paths should not be directory paths", function () {
            expect(lib.isUnixDirectory(".abc")).toBe(false);
            expect(lib.isUnixDirectory(".a/b")).toBe(false);
            expect(lib.isUnixDirectory("a/b")).toBe(false);
            expect(lib.isUnixDirectory(".a/b.out")).toBe(false);
            expect(lib.isUnixDirectory("a/b.c")).toBe(false);
        });    
    });

    describe("lib.parseJSONBooleans", function() {
        it("parseJSONBooleans function must be there in lib", function () {
            expect(lib.parseJSONBooleans).toBeOfType("function");
        });

        it("object properties which have 'false' string should be converted to false", function () {
            
            expect(lib.parseJSONBooleans({
                b: "    false",
                c: "false ",
                d: " false"
            },
            ["a", "b", "c", "d"]
            )).toEqual({
                b: false,
                c: false,
                d: false
            });

        });
        
        it ("property values which do not contain only 'false' string should be considered as true", function(){
            expect(lib.parseJSONBooleans({
                a: "true",
                b: "random    false",
                c: "random",
                d: "abc true"
            },
            ["a", "b", "c", "d"]
            )).toEqual({
                a: true,
                b: true,
                c: true,
                d: true
            }); 

            expect(lib.parseJSONBooleans({
                a: "true",
                b: "    true",
                c: "true ",
                d: " true"
            },
            ["a", "b", "c", "d"]
            )).toEqual({
                a: true,
                b: true,
                c: true,
                d: true
            });
        });

        it("the same variable should be returned in case it is not an object or properties or not passed", function () {
            expect(lib.parseJSONBooleans("a", ["a"])).toBe("a");
            expect(lib.parseJSONBooleans(5, ["a"])).toBe(5);
            expect(lib.parseJSONBooleans(true, ["a"])).toBe(true);
            expect(lib.parseJSONBooleans(false, ["a"])).toBe(false);
            expect(lib.parseJSONBooleans(undefined, ["a"])).toBe(undefined);

            expect(lib.parseJSONBooleans("a")).toBe("a");
            expect(lib.parseJSONBooleans(5, [])).toBe(5);
            expect(lib.parseJSONBooleans(true)).toBe(true);
            expect(lib.parseJSONBooleans(false)).toBe(false);
            expect(lib.parseJSONBooleans(undefined)).toBe(undefined);

            expect(lib.parseJSONBooleans({
                a: "true",
                b: "    true",
                c: "true ",
                d: " true"
            }
            )).toEqual({
                a: "true",
                b: "    true",
                c: "true ",
                d: " true"
            });
        });


    });

    describe("lib.cacher", function () {
        it("cacher function must be there in lib", function () {
            expect(lib.cacher).toBeOfType("function");
        });

        it("A function call with already called arguments should be picked up from the cache instead of it getting called", function() {
            var sum,
                cachedSum;

            sum = function(a, b) {
                sum.callCount = sum.callCount++ || 1;

                return a + b;
            };

            cachedSum = lib.cacher(sum, sum);

            expect(cachedSum(3, 4)).toBe(7);
            expect(sum.callCount).toBe(1);
            expect(cachedSum(3, 4)).toBe(7);
            expect(sum.callCount).toBe(1);

        });

        it ("A function to be cached with Objects as arguments ", function() {
            var fn,
                cachedFn;

            /**
            * fn counts the own properties of obj
            */
            fn = function(obj) {
                var count = 0;

                fn.callCount = fn.callCount++ || 1;
                for(var key in obj) {
                    if (obj.hasOwnProperty(key))
                    {
                        count++;  
                    }
                }

                return count;
            };

            cachedFn = lib.cacher(fn, fn);

            expect(cachedFn({
                a: 1,
                b: 2
            })).toBe(2);
            expect(fn.callCount).toBe(1);
            expect(cachedFn({
                a: 1,
                b: 2,
                c: 3
            })).toBe(3);
            expect(fn.callCount).toBe(2);

        });

    });
});
