// This spec ensures that the version number is consistent across multiple locations in the package.
var fs = require("fs"),
    esprima = require("esprima");

describe ("version name", function () {
    var packageJSON = JSON.parse(fs.readFileSync("./package.json")),
        manTxt = fs.readFileSync("./src/man/jslink.1"),
        coreJS = esprima.parse(fs.readFileSync("./src/core.js"));


});