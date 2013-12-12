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
    DEFAULT_DOT_FILENAME = "./jslinker.dot",
    DEFAULT_OUT_DESTINATION = "./", /** @todo finalise default */

    fs = require("fs"),
    pathUtil = require("path"),
    walkdir = require("walkdir"),
    esprima = require("esprima"),
    lib = require("./lib.js"),

    ModuleCollection = require("./collection.js");

/**
 * Function to add file parsing statistics to collection.
 */
ModuleCollection.analysers.push(function (stat) {
    // All the work for these stats were picked up during execution of loadFromFile function
    stat.filesTotal = this._statFilesTotal;
    stat.filesProcessed = this._statFilesProcessed;
    stat.filesIgnored = this._statFilesTotal - this._statFilesProcessed - this._statFilesError;
});

module.exports = {
    loadFromFile: function (collection, path, recurse, include, exclude) {
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

        // Iterate over the source directories provided the root path exists.
        fs.existsSync(path) && walkdir.sync(path, {
            /*jshint camelcase: false */// turn off since walkdir is 3rd-party.
            no_return: true, // save memory even if one has loads!
            no_recurse: !recurse
            /*jshint camelcase: true */
        }, function (path, stat) {
            var fileName,
                comments,
                comment,
                moduleName, // to control parsing flow when module is discovered in a block
                moduleAdder, // function
                dependencyAdder, // function
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
                    if (moduleName) {
                        throw lib.format("Repeated module definition encountered in single block. " +
                            "{0} dropped in favour of {1} in {2}", $1, moduleName, fileName);
                    }
                    // Only accept the first definition
                    collection.add($1, path);
                    moduleName = $1; // store the module name for subsequent use within this loop.
                }
            };

            // This function adds dependencies for a module that has been discovered. This is defined here to avoid
            // repeated definition within loop.
            dependencyAdder = function ($glob, $1) {
                // Extract the value of the token.
                if ($1 && ($1 = $1.trim())) {
                    collection.connect(moduleName, $1);
                }
            };

            // Loop through the comments and process the "Block" types.
            for (i = 0, ii = comments.length; i < ii; i++) {
                comment = comments[i];
                moduleName = E; // reset lock for parsing modules

                // Only continue if its a block comment and starts with jsdoc syntax. Also prevet blocks having @ignore
                // tags from being parsed.
                if (comment.type !== BLOCK || comment.value.charAt() !== ASTERISK ||
                    /\@ignore[\@\s\r\n]/ig.test(comment.value)) {
                    continue;
                }
                // Search for a module definition in it.
                comment.value.replace(DEFAULT_DEFINE_TAG_PATTERN, moduleAdder);
                // We need to search for dependencies only if a module name has been discovered.
                if (moduleName) {
                    comment.value.replace(DEFAULT_INCLUDE_TAG_PATTERN, dependencyAdder);
                }
            }

            // Since we have reached here there wasn't any error parsing/reading the file and as such we decrement the
            // counter.
            collection._statFilesError--;
            collection._statFilesProcessed++; // increment success counter
        });

        return collection;
    },

    exportDependencyMap: function (collection, path, overwrite) {
        /** @todo refactor */
        // Get the final path to the export file.
        path = lib.writeableFile(path, DEFAULT_DOT_FILENAME, overwrite, true);

        // Ensure that the output file is not one of the input files!
        if (collection.sources[path]) {
            throw new Error("The dot output file path overwrites input files!");
        }

        if ((overwrite === false) && fs.existsSync(path)) {
            throw new Error(lib.format("Cannot overwrite \"{0}\".", path));
        }

        return fs.writeFileSync(path, collection.toString());
    },

    exportToFile: function (collection, suggestedModules, destination, overwrite) {
        /** @todo refactor */
        var serialized = collection.serialize(suggestedModules && Object.keys(suggestedModules)), // get the sorted and serialised set of modules.
            bundles = [],
            appendSource; // function to avoid redefinition in loop

        // Validate and sanitize suggested modules and paths.
        if (!suggestedModules) {
            suggestedModules = {};
        }
        destination = lib.writeableFolder(destination, DEFAULT_OUT_DESTINATION);
        if (!fs.statSync(destination).isDirectory()) {
            throw lib.format("Out put destination is not a directory: \"{0}\"", destination);
        }

        // Iterate on all set of connected module groups within the collection and create array of sourcefiles that
        // contain these modules.
        serialized.forEach(function (modules) {
            var stack = [],
                sources = {}, // use this to check whether a source was already pushed in stack.
                suggested,
                item,
                i;

            if (!modules.length) {
                return;
            }

            i = modules.length;
            while (i--) {
                if (sources[modules[i].source]) {
                    break;
                }
                stack.unshift(modules[i].source);
                sources[modules[i].source] = true; // add to flag
            }

            suggested = false;
            for (item in suggestedModules) {
                suggested = collection.get(item);
                if ((i = modules.indexOf(suggested)) === -1) {
                    continue;
                }
                if (suggestedModules[item] === true || !suggestedModules[item]) {
                    suggestedModules[item] = pathUtil.basename(modules[i].source);
                }
                else {
                    suggestedModules[item] = suggestedModules[item];
                }

                if (/^[^\/].*/.test(suggestedModules[item])) {
                    suggestedModules[item] = pathUtil.join(destination, suggestedModules[item]);
                }

                bundles.push({
                    sources: stack,
                    output: pathUtil.resolve(suggestedModules[item])
                });
                delete suggestedModules[item];
            }

            if (!suggested) {
                bundles[modules[modules.length - 1].name] = {
                    sources: stack,
                    output: pathUtil.resolve(pathUtil.join(destination, pathUtil.basename(modules[modules.length - 1].source) ))
                };
            }

        });

        appendSource = function (sourceFileName) {
            fs.appendFileSync(prop.output, fs.readFileSync(sourceFileName));
        };

        for (var prop in bundles) {
            prop = bundles[prop];
            if (fs.existsSync(prop.output) && overwrite === false) {
                throw "Cannot overwrite " + prop.output;
            }

            fs.openSync(prop.output, "w");
            prop.sources.forEach(appendSource);
        }
    }
};