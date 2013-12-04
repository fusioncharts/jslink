/**
 * @module jslinker.core
 * @requires jslinker.lib
 * @requires jslinker.modulecollection
 * @requires jslinker.moduleio
 */
var lib = require("./lib.js"),
    ansi = require("ansi"),
    cursor = ansi(process.stdout),
    ModuleCollection = require("./modulecollection.js"),
    moduleIO = require("./moduleio.js");

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
            cursor.reset();
            if (error || !collection) {
                cursor.red();
                console.warn(error);
            }
            else {

                var stat = collection.analyse();
                if (stat.orphanModules.length) {
                    cursor.red();
                    console.log(lib.plural(stat.orphanModules.length, "orphan module") + " found.");
                }
                cursor.green();
                console.info(lib.plural(stat.filesProcessed || 0, "file") + " preprocessed.");

            }
            console.timeEnd("Preprocessing time");
            cursor.reset();
        });
    },

    parse: function (options, callback) {
        var collection = new ModuleCollection(),
            token,
            error, // to pass on from try-catch to callback.
            i,
            ii;

        try {
            if (!Array.isArray(options.source)) {
                options.source = [options.source];
            }

            for (i = 0, ii = options.source.length; i < ii; i++) {
                if (options.source[i]) {
                    // Load the module dependencies from file.
                    moduleIO.loadFromFile(collection, options.source[i], options.recursive, options.includePattern,
                        options.excludePattern);
                }
            }

            if (Array.isArray(options.output)) {
                for (i = 0, ii = options.output.length; i < ii; i++) {
                    if (options.output[i] && options.output[i].split && (token = options.output[i].split(":")).length) {
                        moduleIO.exportToFile(collection, token[0], token[1], options.overwrite);
                    }
                }
            }
            else if (options.output) {
                token = options.output.split(":");
                moduleIO.exportToFile(collection, token[0], token[1], options.overwrite);
            }
            else {
                moduleIO.exportAll(collection);
            }
        }
        catch (err) {
            error = err;
        }

        callback && callback(error, collection);
    }
};

module.exports.cli();