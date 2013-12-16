/**
 * This module consists of all the filesystem input output operations needed to load modules from filesystem and export
 * them back. Note that the usage of this module requires one to also include `modules` module in their scope.
 * @module io
 *
 * @requires lib
 * @requires collection
 */

var E = "",
    BLOCK = "Block",
    ASTERISK = "*",
    DEFAULT_INCLUDE_PATTERN = /.+\.js$/,
    DEFAULT_EXCLUDE_PATTERN = /^$/,
    DEFAULT_DEFINE_TAG_PATTERN = /\@module\s*([^\@\r\n]*)/ig,
    DEFAULT_INCLUDE_TAG_PATTERN = /\@requires\s*([^\@\r\n]*)/ig,
    DEFAULT_EXPORT_TAG_PATTERN = /\@export\s*([^\@\r\n]*)/ig,
    DEFAULT_DOT_FILENAME = "jslink.dot",
    DEFAULT_OUT_DESTINATION = "out/",

    fs = require("fs"),
    pathUtil = require("path"),
    walkdir = require("walkdir"),
    esprima = require("esprima"),
    lib = require("./lib.js"),

    ModuleCollection = require("./collection.js"),
    writeSerializedModules; // function

/**
 * Writes a 2d array of modules to a set of files with the module source contents.
 *
 * @param {Array<Array>} matrix
 * @param {string=} destination
 * @param {boolean=} overwrite
 */
writeSerializedModules = function (matrix, destination, overwrite) {
    var createTarget, // function
        appendSource; // function

    // Validate the destination directory.
    destination = lib.writeableFolder(destination, DEFAULT_OUT_DESTINATION);

    if (!fs.statSync(destination).isDirectory()) {
        throw lib.format("Output destination is not a directory: \"{0}\"", destination);
    }

    // Adds the content of source file to target file.
    appendSource = function (sourceFileName) {
        fs.appendFileSync(this[0], fs.readFileSync(sourceFileName));
    };

    // Create or empty the file name from the bunch of targets.
    createTarget = function (targetFileName) {
        targetFileName = pathUtil.join(destination, targetFileName); // append destination to file name
        lib.writeableFile(true, targetFileName, overwrite, false, true);
        this.forEach(appendSource, [targetFileName]);
    };

    matrix.forEach(function (bundle) {
        // Create and append files separately to reduce spatial complexity.
        bundle.targets.forEach(createTarget, bundle.sources);
    });
};

module.exports = {
    /**
     * This function takes in a {@link module:collection~ModuleCollection} and populates it with module dependency tree
     * as loaded from files on the filesystem.
     *
     * @param {module:collection~ModuleCollection} collection
     * @param {string} path
     * @param {boolean=} [recurse]
     * @param {RegExp=|string=} [include]
     * @param {RegExp=|string=} [exclude]
     * @returns {module:collection~ModuleCollection}
     */
    populateCollectionFromFS: function (collection, path, recurse, include, exclude) {
        var esprimaOptions = { // we define it outside to avoid redefinition in loop.
                comment: true
            };

        // Ensure the patterns in paremeter are valid regular expression objects.
        !(include instanceof RegExp) && (include = DEFAULT_INCLUDE_PATTERN);
        !(exclude instanceof RegExp) && (exclude = DEFAULT_EXCLUDE_PATTERN);

        // Store some private values within collection for use during analysis of the collection.
        collection._statFilesTotal = collection._statFilesTotal || 0;
        collection._statFilesProcessed = collection._statFilesProcessed || 0;
        collection._statFilesError = collection._statFilesError || 0;

        // If path does not exist, it is an error
        if (!fs.existsSync(path)) {
            throw new Error(lib.format("Source path \"{0}\" does not exist or is not readable.", path));
        }

        // Iterate over the source directories provided the root path exists.
        walkdir.sync(path, {
            /*jshint camelcase: false */// turn off since walkdir is 3rd-party.
            no_return: true, // save memory even if one has loads!
            no_recurse: !recurse
            /*jshint camelcase: true */
        }, function (path, stat) {
            var fileName,
                comments,
                comment,
                module, // to control parsing flow when module is discovered in a block
                moduleAdder, // function
                dependencyAdder, // function
                exportAdder, // function
                i,
                ii;
            // Increment counter of total file processing.
            collection._statFilesTotal++;

            // Allow only non-hidden files to proceed.
            if (lib.isUnixHiddenPath(path) || !stat.isFile()) {
                return;
            }
            // Extract the name to apply io patterns on. The patterns will not work out if full path is passed to
            // pattern matching.
            fileName = pathUtil.basename(path);
            if (exclude.test(fileName) || !include.test(fileName)) {
                return;
            }

            // We increment the error counter here and would decrement later when all goes well.
            collection._statFilesError++;

            // Since parsing might have error, but that needs to be trapped to return error report. Thus, we wrap it
            // inside a try block.
            try {
                // While calling esprima, we set `comments: true` to get the list of comments in code.
                comments = esprima.parse((fs.readFileSync(path) || E).toString(), esprimaOptions).comments || [];
            }
            catch (err) {
                throw lib.format("{1}\n> {0}", path, err.message);
            }

            // This function is passed to the replacer function to excavate the module name from the module definition
            // line and then add it to the collection. This is defined here to avoid overhead of redefinition within a
            // loop.
            moduleAdder = function ($glob, $1) {
                // Extract the value of the token.
                if ($1 && ($1 = $1.trim())) {
                    // In case token has been already been defined, we know that it is a repeated module definition
                    // and warn the same.
                    if (module) {
                        throw lib.format("Repeated module definition encountered in single block. " +
                            "{0} dropped in favour of {1} in {2}", $1, module, fileName);
                    }
                    // Only accept the first definition
                    // store the module name for subsequent use within this loop.
                    module = collection.add($1, path);
                }
            };

            // This function adds dependencies for a module that has been discovered. This is defined here to avoid
            // repeated definition within loop.
            dependencyAdder = function ($glob, $1) {
                // Extract the value of the token.
                if ($1 && ($1 = $1.trim())) {
                    collection.connect(module, $1);
                }
            };

            // This function searches whether the module definition has any export directive. This is defined here to
            // avoid repeated definition within loop.
            exportAdder = function ($glob, $1) {
                // Extract the value from token.
                if ($1 && ($1 = $1.trim())) {
                    module.addTarget($1);
                }
            };

            // Loop through the comments and process the "Block" types.
            for (i = 0, ii = comments.length; i < ii; i++) {
                comment = comments[i];
                module = undefined; // reset lock for parsing modules

                // Only continue if its a block comment and starts with jsdoc syntax. Also prevet blocks having @ignore
                // tags from being parsed.
                if (comment.type !== BLOCK || comment.value.charAt() !== ASTERISK ||
                    /\@ignore[\@\s\r\n]/ig.test(comment.value)) {
                    continue;
                }
                // Search for a module definition in it.
                comment.value.replace(DEFAULT_DEFINE_TAG_PATTERN, moduleAdder);
                // We need to search for dependencies only if a module name has been discovered.
                if (module) {
                    // Add @requires
                    comment.value.replace(DEFAULT_INCLUDE_TAG_PATTERN, dependencyAdder);
                    // Add @export
                    comment.value.replace(DEFAULT_EXPORT_TAG_PATTERN, exportAdder);
                }
            }

            // Since we have reached here there wasn't any error parsing/reading the file and as such we decrement the
            // counter.
            collection._statFilesError--;
            collection._statFilesProcessed++; // increment success counter
        });

        return collection;
    },

    exportCollectionToFS: function (collection, destination, overwrite, testMode) {
        var serialized = collection.serialize(),
            matrix = [];

        // Iterate on all set of connected module groups within the collection and create array of sourcefiles that
        // contain these modules.
        serialized.forEach(function (modules) {
            var stack = [],
                targets = [],
                added = {}, // use this to check whether a source was already pushed in stack.
                module,
                i;

            // Least likely, but module can end up having all disconnected empty subgraphs... don't know when though!
            if (!modules.length) {
                return;
            }

            i = modules.length;
            while (i--) {
                module = modules[i];
                // We would not add the same source twice and hence check the hash.
                if (added[module.source]) {
                    break;
                }
                // Add to flag even if it is not defines, so that repeated checks are not needed.
                added[module.source] = true;
                // Add the module to export stack provided its source has been defined.
                if (module.defined()) {
                    stack.unshift(module.source); // add it to stack
                    // We check if this module has any export directives and if so, add it for later.
                    module.targets && (targets = targets.concat(module.targets));
                }
            }
            matrix.push({
                sources: stack,
                targets: targets
            });
        });

        // If test mode is true, we do not need to proceed further with exporting the files
        if (!testMode) {
            writeSerializedModules(matrix, destination, overwrite);
        }
    },

    /**
     * Export the dependency map of a collection as a graphViz `dot` file.
     *
     * @param {module:collection~ModuleCollection} collection
     * @param {string} path
     * @param {boolean=} [overwrite]
     * @returns {module:collection~ModuleCollection}
     */
    writeCollectionToDot: function (collection, path, overwrite) {
        // Get the final path to the export file.
        path = lib.writeableFile(path, DEFAULT_DOT_FILENAME, overwrite, true);

        // Ensure that the output file is not one of the input files!
        if (collection.sources[path]) {
            throw new Error("The dot output file path overwrites input files!");
        }

        // In case overwriting is disabled, we check whether the dot file already exists or not.
        if ((overwrite === false) && fs.existsSync(path)) {
            throw new Error(lib.format("Cannot overwrite \"{0}\".", path));
        }

        // Thankfully, the dot file is generated by the collection's toString method itself.
        fs.writeFileSync(path, collection.toString());
        return collection;
    }
};

/**
 * Function to add file parsing statistics to collection.
 */
ModuleCollection.analysers.push(function (stat) {
    // All the work for these stats were picked up during execution of loadFromFile function
    stat.filesTotal = this._statFilesTotal;
    stat.filesProcessed = this._statFilesProcessed;
    stat.filesIgnored = this._statFilesTotal - this._statFilesProcessed - this._statFilesError;
});