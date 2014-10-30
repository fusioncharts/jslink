/**
 * Preprocessor for JavaScript
 * @module jslink
 * @export jslink.js
 *
 * @requires lib
 * @requires collection
 * @requires io
 */
var VERSIONSTRING = '1.1.3',
    lib = require('./lib.js'),
    ansi = require('ansi'),
    cursor = ansi(process.stdout),
    ModuleCollection = require('./collection.js'),
    moduleIO = require('./io.js'),
    program = require('commander');


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
        destination: 'out/',
        strict: true,
        exportmap: false,
        overwrite: false,
        verbose: false,
        help: false,
        test: false,
        debug: false,
        quiet: false
    },

    /**
     * Process commandline
     */
    cli: function (argv) {
        // Parse all command-line arguments as an object and populate the unspecified properties with default
        // options.
        var conf;

        program
        .version(VERSIONSTRING)
        .option('--source <location>', 'The source directory to read modules from')
        .option('--destination <location>', 'The output directory where all processed files will be saved')
        .option('--includePattern <regex>', 'White-list of input files names from source directory')
        .option('--excludePattern <regex>', 'Black-list of input files names from source directory')
        .option('--conf <location>', 'jslink configuration JSON file location')
        .option('--recursive', 'Look into all sub-directories while reading source directory')
        .option('--strict', 'Run in strict mode')
        .option('--verbose', 'Will output (hopefully) useful information during the linking process')
        .option('--quiet', 'Don\'t show error messages')
        .option('--exportmap', 'Generate a mpa structure of the collection.')
        .option('--debug', 'Show error and debug messages')
        .option('--test', 'Run jslink in test mode without writing to file-system')
        .parse(argv);

        // Check whether to read options from a configuration file.
        if (program.conf && (typeof (conf = lib.readJSONFromFile(program.conf)).options === 'object')) {
            lib.fill(program, conf.options);
        }
        // set default values
        lib.fill(program, module.exports.options);

        if (program.quiet) {
            global.jslinkQuiet = true;
        }
        else if (program.verbose) {
            global.jslinkVerbose = true;
        }

        // If the test flag is set to true, we do not initiate export of the files. Though we need to calculate
        // dependency in order to show results of cyclic errors
        if (program.test) {
            cursor.write('Running in test mode.\n');
        }

        // Notify that the processing started and also keep a note of the time.
        console.time('Preprocessing time');
        cursor.write('.');

        // Do some sanity on the options.
        ['includePattern', 'excludePattern'].forEach(function (pattern) {
            if (program[pattern] && !program[pattern].test) {
                program[pattern] = new RegExp(program[pattern]);
            }
        });

        return this.parse(program, function (error, collection, stat) { // callback for output to console
            cursor.reset().write('\n');
            if (error) {
                cursor.red().write((error.message && error.message || error) + '\n');
            }
            else if (collection) {
                cursor.green()
                    .write(lib.format('{0} with {1} processed for {2}.\n', lib.plural(stat.filesProcessed ||
                            0, 'file'),
                        lib.plural(stat.definedModules.length || 0, 'module'),
                        lib.plural(stat.numberOfExports || 0, 'export directive')));

            }
            console.timeEnd('Preprocessing time');
            cursor.reset();
            // throw error in console for debug mode so that call stack/trace is visible.
            if (program.debug && error) {
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
            cursor.write('.');
            stat = collection.analyse();
            cursor.write('.');

            if (options.strict) {
                if (stat.orphanModules.length) {
                    throw new Error(lib.format('{0} detected under strict mode.\n- {1}',
                        lib.plural(stat.orphanModules.length, 'orphan module'), stat.orphanModules.join(
                            '\n- ')));
                }
            }

            if (options.exportmap) {
                moduleIO.writeCollectionToDot(collection, options.exportmap, options.overwrite);
                cursor.write('.');
            }


            moduleIO.processCollectionSources(collection, options);
            cursor.write('.');

            moduleIO.exportCollectionToFS(collection, options.destination, options.overwrite, options.test);
            cursor.write('.');
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
    }
};
