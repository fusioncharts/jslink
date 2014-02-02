/**
 * @fileOverview
 * This test specs runs tests on the package.json file of repository. It has a set of strict tests on the content of
 * the file as well. Any change to package.json must be accompanied by valid test case in this spec-sheet.
 */

/* global describe, it, expect */
describe ("package.json", function () {
    var WORKING_DIRECTORY = "./",
        PACKAGE_FILENAME = "package.json",

        path = require("path"),
        fs = require("fs"),

        location = path.join(WORKING_DIRECTORY, PACKAGE_FILENAME),
        content,
        json;

    it ("must exist", function () {
        expect(fs.existsSync(location)).toBeTruthy();
    });

    it ("must have readable content", function () {
        expect(content = fs.readFileSync(location).toString()).toBeTruthy();
    });

    it ("content must be valid JSON", function () {
        expect(json = JSON.parse(content)).toBeTruthy();
    });

    describe ("package.json JSON data", function () {
        it ("must have valid name, description and author", function () {
            expect(json.name).toBe("jslink");
            expect(json.description).toBe("Preprocessor for JavaScript");
            expect(json.author).toBe("FusionCharts Technologies  <mail@labs.fusioncharts.com>");
            expect(json.license).toBe("MIT");
        });

        it ("must have a valid version string valid semantic version format", function () {
            expect(json.version).toMatchSemVer();
        });

        it ("should prefer global", function () {
            expect(json.preferGlobal).toBe(true);
        });

        it ("keywords should be", function () {
            expect(json.keywords).toBeJSONEquals([
                "preprocessor",
                "linker",
                "@module",
                "@requires",
                "closure",
                "jsdoc",
                "concatenation",
                "integration",
                "build",
                "automation"
            ]);
        });

        it ("should point to the test script", function () {
            expect(fs.existsSync(json.scripts.test)).toBeTruthy();
        });

        it ("should declare proper binary", function () {
            expect(fs.existsSync(json.bin[json.name])).toBeTruthy();
        });
    });
});
