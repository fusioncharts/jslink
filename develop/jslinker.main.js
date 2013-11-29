/**
 * @module jslinker.main
 * @requires jslinker.lib
 * @requires jslinker.modulecollection
 */
var lib = require("./jslinker.lib.js"),
    ModuleCollection = require("./jslinker.modulecollection.js");

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
                options[pattern] = new RegExp(options[pattern]);
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

    parse: function (options) {
        var collection = new ModuleCollection(),
            stat,
            i,
            ii;

        if (!Array.isArray(options.source)) {
            options.source = [options.source];
        }

        for (i = 0, ii = options.source.length; i < ii; i++) {
            // Load the module dependencies from file.
            ModuleCollection.loadFromFile(collection, options.source[i], options.recursive, options.includePattern,
                options.excludePattern);
        }

        stat = collection.analyse();
        console.log(stat);
    }
};

module.exports.cli();