/**
 * @module jslinker.main
 * @requires jslinker.lib
 * @requires jslinker.modulecollection
 * @requires jslinker.moduleio
 */
var lib = require("./jslinker.lib.js"),
    ModuleCollection = require("./jslinker.modulecollection.js");

require("./jslinker.moduleio.js");

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

        return this.parse(options, function (error, collection) { // callback for output to console
            if (error) {
                console.warn("Error:" + error.message);
            }
            var stat = collection && collection.analyse();

            console.info(lib.plural(stat && stat.filesProcessed || 0, "file") + " preprocessed.");
            console.timeEnd("Preprocessing time");
        });
    },

    parse: function (options, callback) {
        var collection = new ModuleCollection(),
            token,
            i,
            ii;

        try {
            if (!Array.isArray(options.source)) {
                options.source = [options.source];
            }

            for (i = 0, ii = options.source.length; i < ii; i++) {
                if (options.source[i]) {
                    // Load the module dependencies from file.
                    collection.loadFromFile(options.source[i], options.recursive, options.includePattern,
                        options.excludePattern);
                }
            }

            if (Array.isArray(options.output)) {
                for (i = 0, ii = options.output.length; i < ii; i++) {
                    if (options.output[i] && options.output[i].split && (token = options.output[i].split(":")).length) {
                        collection.exportToFile(token[0], token[1], options.overwrite);
                    }
                }
            }
            else {
                token = options.output.split(":");
                collection.exportToFile(token[0], token[1], options.overwrite);
            }
        }
        catch (err) {
            callback && callback(err, collection);
        }

        callback && callback(undefined, collection);
    }
};

module.exports.cli();