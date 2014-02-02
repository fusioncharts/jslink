/**
 * @fileOverview
 * This file contains all test specifications that require to be executed to ensure that the product version number is
 * uniform across various manifestations in the code (e.g. man page, package.json, etc.)
 */

/* global describe, it, expect */
describe ("product version string", function () {
    var fs = require("fs"),
        versions = {};

    it ("must be defined in package.json", function () {
        var version = JSON.parse(fs.readFileSync("./package.json")).version;
        expect(version).toBeTruthy();
        expect(version).toMatchSemVer();
        versions.package = version;
    });

    it ("must be defined in man page", function () {
        var version = fs.readFileSync("./src/man/jslink.1").toString()
                .match(/\n\.TH man 8 \".*?\" \"(.*?)\" \"jslink man page\"\n/);

        expect(version).toBeTruthy();
        expect(version.length).toBe(2);
        expect(version[1]).toMatchSemVer();
        versions.man = version[1];
    });

    it ("must be defined in core.js", function () {
        var version = fs.readFileSync("./src/core.js").toString()
                .match(/\nvar VERSIONSTRING = \"(.*?)\"\,\n/);

        expect(version).toBeTruthy();
        expect(version.length).toBe(2);
        expect(version[1]).toMatchSemVer();
        versions.core = version[1];
    });

    it ("must be uniform in man and package", function () {
        expect(versions.man).toBe(versions.package);
    });

    it ("must be uniform in core.js and package", function () {
        expect(versions.core).toBe(versions.package);
    });
});
