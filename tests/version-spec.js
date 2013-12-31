// This spec ensures that the version number is consistent across multiple locations in the package.
var fs = require("fs");

describe ("version name", function () {
    var packageJSON = JSON.parse(fs.readFileSync("./package.json"));

});