/**
 * @module jslinker
 * @requires jslinker.lib
 * @requires jslinker.parser
 */
var lib = require("./jslinker.lib.js"),
    parser = require("./jslinker.parser.js");

module.exports = {
    options: {
        recursive: false,
        includePattern: /.+\.js$/,
        excludePattern: /^$/,
        destination: "./mods"
    },

    cli: function () {
        // Parse all command-line arguments as an object and populate the unspecified properties with default
        // options.
        var options = lib.argsArray2Object(process.argv.slice(2));

        // Notify that the processing started and also keep a note of the time.
        console.time("Preprocessing time");
        console.log("...");

        // Do some sanity on the options.
        ["includePattern", "excludePattern"].forEach(function (pattern) {
            if (options[pattern] && !options[pattern].test) {
                options[pattern] = new RegExp(pattern);
            }
        });

        return this.parse(options, function (err, src) { // callback for output to console
            if (err) {
                console.warn("Error:" + err);
            }
            console.info(lib.plural(src && src.length || 0, "file") + " preprocessed.");
            console.timeEnd("Preprocessing time");
        });
    },

    parse: function (options, callback) {
        // Get the contents of the source files
        return callback && parser.start(lib.fill(options, this.options), callback);
    }
};

module.exports.cli();