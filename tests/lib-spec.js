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
        })
    });

});
