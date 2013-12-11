/**
 * Preprocessor for JavaScript
 * @module core
 *
 * @requires lib
 * @requires collection
 * @requires io
 */
var VERSIONSTRING = "1.0.0",
    lib = require("./lib.js"),
    ansi = require("ansi"),
    cursor = ansi(process.stdout),
    ModuleCollection = require("./collection.js"),
    moduleIO = require("./io.js");


module.exports = /** @lends module:jslinker */ {
    /**
     * Version of jsLinker
     * @returns {string}
     */
    version: function () {
        return VERSIONSTRING;
    },

    options: { /** @todo finalise how to use this implementation */
        recursive: false,
        includePattern: /.+\.js$/,
        excludePattern: /^$/,
        destination: "./"
    },

    /**
     * Process commandline
     */
    cli: function () { /** @todo refactor */
        // Parse all command-line arguments as an object and populate the unspecified properties with default
        // options.
        var options = lib.argsArray2Object(process.argv.slice(2));

        // If version query is sent then ignore all other options
        if (options.version) {
            console.log("jslinker " + VERSIONSTRING);
            return;
        }

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
            var i;

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
                    i = stat.orphanModules.length;
                    while (i--) {
                        console.log(lib.format("- {0}", stat.orphanModules[i].name));
                    }
                }
                cursor.green();
                console.info(lib.format("{0}, {1} processed.", lib.plural(stat.filesProcessed || 0, "file"),
                    lib.plural(stat.definedModules.length || 0, "module")));

            }
            console.timeEnd("Preprocessing time");
            cursor.reset();
        });
    },

    /**
     * @param {object} options
     * @param {module:jslinker~parseResult=} [callback]
     * @returns {ModuleCollection}
     */
    parse: function (options, callback) { /** @todo refactor */
        var collection = new ModuleCollection(),
            token,
            error, // to pass on from try-catch to callback.
            outputModules,
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
                outputModules = {};
                for (i = 0, ii = options.output.length; i < ii; i++) {
                    if (options.output[i] && options.output[i].split && (token = options.output[i].split(":")).length) {
                        if (token[0]) {
                            token[0] = token[0].replace(/\\\:/g, ":");
                            outputModules[token[0]] = token[1] && token[1].toString && token[1].toString() || true;
                        }
                        else {
                            throw "Invalid output suggestion: " + options.output[i];
                        }
                    }
                }

                if (!Object.keys(outputModules).length) {
                    moduleIO.exportToFile(collection, null, options.destination, !!options.overwrite);
                }
                moduleIO.exportToFile(collection, outputModules, options.destination, !!options.overwrite);

            }
            else if (options.output && options.output.split) {
                token = options.output.split(":");
                if (token[0]) {
                    token[0] = token[0].replace(/\\\:/g, ":");
                    outputModules = {};
                    outputModules[token[0]] = token[1] && token[1].toString && token[1].toString() || true;;
                }
                else {
                    throw "Invalid output suggestion: " + options.output;
                }

                moduleIO.exportToFile(collection, outputModules, options.destination, !!options.overwrite);
            }
            else {
                moduleIO.exportToFile(collection, null, options.destination, !!options.overwrite);
            }

            if (options.exportmap) {
                moduleIO.exportDependencyMap(collection, options.exportmap, !!options.overwrite);
            }
        }
        catch (err) {
            error = err;
        }

        /**
         * @callback module:jslinker~parseResult
         * @param {Error=} [error]
         * @param {module:collection~ModuleCollection} [collection]
         */
        callback && callback(error, collection);
        return collection;
    }
};