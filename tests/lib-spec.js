describe("library module", function () {
    var lib = require("../develop/jslinker.lib.js");

    it ("must have `plural` function", function () {
        expect(typeof lib.plural === "function").toBeTruthy();
    });

    it ("plural must return exact word when count is less than or equal to 1", function () {
        expect(lib.plural(0, "word").toMatch("word"));
        expect(lib.plural(1, "word").toMatch("word"));
        expect(lib.plural(-1, "word").toMatch("word"));
    });
});