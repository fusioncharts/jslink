/**
 * Preprocessor for JavaScript
 * @module core
 *
 * @requires lib
 * @requires collection
 * @requires io
 */
var VERSIONSTRING = "0.0.1",
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
        destination: "./out/",
        strict: true,
        exportmap: false,
        overwrite: false,
        verbose: false,
        help: false,
        test: false
    },

    /**
     * Process commandline
     */
    cli: function (argv) { /** @todo refactor */
        // Parse all command-line arguments as an object and populate the unspecified properties with default
        // options.
        var options = lib.argsArray2Object(argv.slice(2));

        // Check whether to read options from a configuration file.
        if (options.conf) {
            options = lib.fill(options, lib.readJSONFromFile(options.conf));
        }
        options = lib.fill(options, module.exports.options);
        options = lib.parseJSONBooleans(options, ["recursive", "exportmap", "overwrite", "strict", "verbose", "help",
            "test"]);

        // If version query is sent then ignore all other options
        if (options.version) {
            console.log("jslinker " + VERSIONSTRING);
            return;
        }

        if (options.help) {
            this.help();
            return;
        }

        if (options.verbose) {
            global.jslinkerVerbose = true;
        }

        // Notify that the processing started and also keep a note of the time.
        console.time("Preprocessing time");
        console.log("...");

        if (global.jslinkerVerbose) {
            console.log("Processing with the following configuration:");
            for (var prop in options) {
                console.log(" ", prop + ":", options[prop]);
            }
        }

        // Do some sanity on the options.
        ["includePattern", "excludePattern"].forEach(function (pattern) {
            if (options[pattern] && !options[pattern].test) {
                options[pattern] = new RegExp(options[pattern]);
            }
        });

        return this.parse(options, function (error, collection, stat) { // callback for output to console
            cursor.reset();
            if (error || !collection) {
                cursor.red();
                console.warn(error);
            }
            else {
                cursor.green();
                console.info(lib.format("{0}, {1} processed for {2}.", lib.plural(stat.filesProcessed || 0, "file"),
                    lib.plural(stat.definedModules.length || 0, "module"),
                    lib.plural(stat.numberOfExports || 0, "export directive")));

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
            error, // to pass on from try-catch to callback.
            stat,
            i,
            ii;

        try {
            if (!Array.isArray(options.source)) {
                options.source = [options.source];
            }

            for (i = 0, ii = options.source.length; i < ii; i++) {
                if (options.source[i]) {
                    // Load the module dependencies from file.
                    moduleIO.populateCollectionFromFS(collection, options.source[i], Boolean(options.recursive),
                        options.includePattern, options.excludePattern);
                }
            }

            // Make options.destination relative
            if (options.hasOwnProperty("destination")) {
                options.destination = "./" + options.destination;
            }

            stat = collection.analyse();
            if (options.strict && stat.orphanModules.length) {
                throw lib.format("{0} detected under strict mode.\n- {1}", lib.plural(stat.orphanModules.length,
                    "orphan module"), stat.orphanModules.join("\n- "));
            }

            if (options.exportmap) {
                moduleIO.writeCollectionToDot(collection, options.exportmap, options.overwrite);
            }

            // Export files unless test flag is true.
            if (!options.test) {
                moduleIO.exportCollectionToFS(collection, options.destination, options.overwrite, options.strict);
            }
        }
        catch (err) {
            error = err;
            throw err;
        }

        /**
         * @callback module:jslinker~parseResult
         * @param {Error=} [error]
         * @param {module:collection~ModuleCollection} [collection]
         */
        callback && callback(error, collection, stat);
        return collection;
    },

    /**
     * This function neatly outputs the program's commandline options and usage guides to the terminal. This is
     * generally called by `cli` parsing method when `--help` option is set to true.
     * @private
     */
    help: function () {

        cursor
            // Split out the version
            .bold()
            .write("\njslinker " + VERSIONSTRING + "\n").reset()

            // Show commandline usage instruction
            .underline()
            .write("Commandline usage").reset().write(":\n")

            .write("--version\tVersion info of jslinker\n")
            .write("--source\tSource directory that is to be preprocessed\n")
            .write("--verbose\tOutput all jslinker activities\n");
    }
};