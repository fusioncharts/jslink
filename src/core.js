/**
 * Preprocessor for JavaScript
 * @module jslink
 * @export jslink.js
 *
 * @requires lib
 * @requires collection
 * @requires io
 */
var VERSIONSTRING = "1.1.1",
    lib = require("./lib.js"),
    ansi = require("ansi"),
    cursor = ansi(process.stdout),
    ModuleCollection = require("./collection.js"),
    moduleIO = require("./io.js");


module.exports = /** @lends module:jslink */ {
    /**
     * Version of jsLink
     * @returns {string}
     */
    version: function () {
        return VERSIONSTRING;
    },

    options: { /** @todo finalise how to use this implementation */
        recursive: false,
        includePattern: /.+\.js$/,
        excludePattern: /^$/,
        destination: "out/",
        strict: true,
        exportmap: false,
        overwrite: false,
        verbose: false,
        help: false,
        test: false,
        debug: false
    },

    /**
     * Process commandline
     */
    cli: function (argv) { /** @todo refactor */
        // Parse all command-line arguments as an object and populate the unspecified properties with default
        // options.
        var options = lib.argsArray2Object(argv.slice(2), "source"),
            conf;

        // Check whether to read options from a configuration file.
        if (options.conf && (typeof (conf = lib.readJSONFromFile(options.conf)).options === "object")) {
            options = lib.fill(options, conf.options);
        }
        options = lib.fill(options, module.exports.options);
        options = lib.parseJSONBooleans(options, ["recursive", "exportmap", "overwrite", "strict", "verbose", "help",
            "test", "debug"]);

        // If version query is sent then ignore all other options
        if (options.version) {
            console.log("jslink " + VERSIONSTRING);
            return;
        }

        if (options.help) {
            this.help();
            return;
        }

        if (options.verbose) {
            global.jslinkVerbose = true;
        }

        // If the test flag is set to true, we do not initiate export of the files. Though we need to calculate
        // dependency in order to show results of cyclic errors
        if (options.test) {
            cursor.write ("Running in test mode.\n");
        }

        // Notify that the processing started and also keep a note of the time.
        console.time("Preprocessing time");
        cursor.write(".");

        if (global.jslinkVerbose) {
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
            cursor.reset().write("\n");
            if (error) {
                cursor.red().write((error.message && error.message || error) + "\n");
            }
            else if (collection) {
                cursor.green()
                .write(lib.format("{0} with {1} processed for {2}.\n", lib.plural(stat.filesProcessed || 0, "file"),
                    lib.plural(stat.definedModules.length || 0, "module"),
                    lib.plural(stat.numberOfExports || 0, "export directive")));

            }
            console.timeEnd("Preprocessing time");
            cursor.reset();
            // throw error in console for debug mode so that call stack/trace is visible.
            if (options.debug && error) {
                throw error;
            }
            process.exit(+!!(error || !collection));
        });
    },

    /**
     * @param {object} options
     * @param {module:jslink~parseResult=} [callback]
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
            cursor.write(".");
            stat = collection.analyse();
            cursor.write(".");

            if (options.strict) {
                if (stat.orphanModules.length) {
                    throw new Error(lib.format("{0} detected under strict mode.\n- {1}",
                        lib.plural(stat.orphanModules.length, "orphan module"), stat.orphanModules.join("\n- ")));
                }
            }

            if (options.exportmap) {
                moduleIO.writeCollectionToDot(collection, options.exportmap, options.overwrite);
                cursor.write(".");
            }

            moduleIO.exportCollectionToFS(collection, options.destination, options.overwrite, options.test);
            cursor.write(".");
        }
        catch (err) {
            error = err;
        }

        /**
         * @callback module:jslink~parseResult
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
            .reset()
            .write("jslink <source-location> [<source-location>...] [--option[=<value>]...]\n\n")

            // Show commandline usage instruction
            .underline()
            .write("Parameters").reset().write(":\n")

            .write("--destination=<location>\tThe output directory where all processed files will be saved\n")
            .write("--includePattern=<regex>\tWhite-list of input files names from source directory\n")
            .write("--excludePattern=<regex>\tBlack-list of input files names from source directory\n")
            .write("--source=<location> (...)\tThe source directory to read modules from\n")
            .write("--conf=<location>\t\tjslink configuration JSON file location\n\n")
            .write("--recursive\tLook into all sub-directories while reading source directory\n")
            .write("--test\t\tRun jslink in test mode without writing to file-system\n")
            .write("--verbose\tWill output (hopefully) useful information during the linking process\n")
            .write("--help\t\tOutputs the usage help text to terminal\n")
            .write("--version\tShows the jslink version being used\n\n");
    }
};
