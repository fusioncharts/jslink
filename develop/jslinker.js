/**
 * @module foo
 * @requires bar
 */
(function () {

    const E = "",
        STRING = "string";

    var fs = require("fs"),
        path = require("path"),
        esprima = require("esprima"),

        forEachFileIn,
        fetchSources,
        parse,

        notBlackListed,

        SourceFile;

    /**
     * Checks whether a source file or directory is blacklisted from access. Usually these are hidden or system files
     * name starting with a dot.
     * @param {string} source - The path of the file that needs to be validated.
     * returns {boolean} - `true` if the source is blacklisted and otherwise `false`.
     */
    blackListed = function (source) {
        return /^\.+[^\/\.]/g.test(source);
    };

    /**
     * Define a source file that needs to be pre-processed.
     * @constructor
     *
     * @param {string} path - The path of the file that will be pre-processed. This needs to be pre-validated to be
     * a single file and must exist and be readable.
     */
    SourceFile = function (path) {
        this.path = path || this.path;
    };

    /**
     * Reads the contents of the file in a synchronous manner and stores it as raw content of the instance of
     * {@link SourceFile}.
     */
    SourceFile.prototype.readSync = function () {
        this.raw = (this.path && fs.readFileSync(this.path) || E).toString();
    };

    /**
     * Parses the raw content of a {@link SourceFile} and extracts the module definitions and dependencies as provided
     * by jsDoc comment tags.
     * returns {boolean} - `true` when the file has been successfully parsed or `false` in case of parse failure.
     */
    SourceFile.prototype.parse = function () {
        var comments,
            modules,
            requires;

        // Since parsing might have error, but that needs to be trapped to return error report. Thus, we wrap it inside
        // a try block.
        try {
            // While calling esprima, we set `comments: true` to get the list of comments in code.
            comments = esprima.parse(this.raw || E, {
                comment: true
            }).comments;
        }
        catch (err) {
            return false;
        }

        // Reset the dependency and definition declarations for the file.
        modules = this.modules = [];
        requires = this.requires = [];

        // We iterate over each comment block and process them. This area is memory-leak prone and as such care must be
        // // taken while referencing variables.
        comments.forEach(function (item) {
            if (item.type === "Block" && item.value.charAt() === "*") {
                item.value.replace(/\@module\s*([^\@]*)/ig, function ($glob, $1) {
                    modules.push($1.replace(/\r?\n\ *\*/, E).trim());
                });
                item.value.replace(/\@requires\s*([^\@]*)/ig, function ($glob, $1) {
                    requires.push($1.replace(/\r?\n\ *\*/, E).trim());
                });
            }
        });
        return true;
    };

    /**
     * Iterate over a bunch of paths and execute a callback whenever a valid file is encountered.
     * @param {string|Array<string>} sources - Files or directories that needs to be treated as input files.
     * @param {function} callback - Callback function that is executed whenever a files is encountered. The first
     * argument passed to the callback is the full file path (relative) and the second parameter is the file name.
     * @param {boolean=} [recursive] - A flag that sets whether to recursively look into the directories provided as
     * sources.
     */
    forEachFileIn = function (sources, callback, recursive) {
        var source,
            stat,
            item,
            name;

        // Convert to array if input is string
        if (typeof sources === STRING) {
            sources = [sources];
        }

        // Iterate on the sourceFiles array and on each path provided, operations are to be performed.
        while (source = sources.shift()) {
            // If the path exists on disk, it is implied that the path resolves to either a file and directory. As such
            // Operations are to be performed on the file or all files within a directory.
            if (!blackListed(source) && fs.existsSync(source)) {
                // Fetch the path stats to check various properties. This will later be used to check whether this is a
                // file or directory.
                stat = fs.statSync(source);
                // In case the path is a directory, we need to apply callback on all files within in this directory and
                // if needed recurse.
                if (stat.isDirectory()) {
                    // We fetch of all items within the directory and we iterate over the directory items and execute
                    // callback on files and if recursion is enabled, we start repeating same stuffs on them.
                    fs.readdirSync(source).forEach(function (name) {
                        // We join the items with sources while evaluating the condition below.
                        if (!blackListed(name) && fs.existsSync(item = path.join(source, name))) {
                            // We fetch the stat of the directory item and reuse the `stat` variable to store it.
                            stat = fs.statSync(item);
                            // If this is a file, we execute callback and based on its return, break function.
                            if (stat.isFile()) {
                                if (callback(item, name) === false) {
                                    return;
                                }
                            }
                            // In case the item turns out to be a directory again, we recurse if needed.
                            else if (recursive && stat.isDirectory()) {
                                forEachFileIn(item, callback, recursive);
                            }
                        }
                    });
                }
                // In case the path is a file, then we apply callback to it and based on its return, break function.
                else if (stat.isFile()) {
                    if (callback(source, path.basename(source)) === false) {
                        return;
                    }
                }
            }
        } // end while
    };

    /**
     * Process a list of source files - fetch all file contents and determine the module definitions and requirements
     * within each.
     *
     * @param {string|Array<string>} sourceFiles - List of input files
     * @param {boolean=} [recursive=false] - Specify to whether recursively process files when the input specifies
     * directories.
     * @param {string=} [includePattern] - String that has a `Regular Expression` to validate whether an input file is
     * to be accepted for parsing or not. Very useful to limit to file types, etc.
     * @param {string=} [excludePattern] - String that has a `Regular Expression` to match file names that invalidates
     * them from being included while processing directories or files as sources.
     *
     * returns {Array<SourceFile>} - Get access to all the sources processed from the given parameters.
     */
    fetchSources = function (sourceFiles, recursive, includePattern, excludePattern) {
        var out = [],
            paths,
            path,
            stat,
            source;

        // Validate sourcefiles to be an array
        if (!Array.isArray(sourceFiles)) {
            throw "Expecting sourceFiles argument as an Array";
        }

        forEachFileIn(sourceFiles, function (path, file) {
            if (excludePattern && excludePattern.test(file)) {
                return;
            }
            if (includePattern && !includePattern.test(file)) {
                return;
            }
            out.push(source = new SourceFile(path));
            source.readSync();
            if (source.parse()) {
                console.log(file);
                console.log("\tmodules ->", source.modules);
                console.log("\tdependencies ->", source.requires);
            }

        }, recursive);
        return out;
    };

    module.exports = {
        cli: function () {
            var options = {},
                args = process.argv.slice(2),
                arg;

            // Loop through arguments and prepare options object.
            while (arg = args.shift()) {
                arg.replace(/^\-\-([a-z]*)\=?([\s\S]*)?$/i, function ($glob, $1, $2) {
                    // If the option already exists, push to the values array otherwise create a new values array.
                    if (options[$1]) {
                        options[$1].push($2);
                    }
                    else {
                        options[$1] = [$2];
                    }
                });
            }
            return this.parse(options);
        },

        parse: function (options) {
            var sources;
            // In case source is not provided, no point proceeding
            if (!options.source) {
                return;
            }
            console.time("Preprocessing time");
            console.log("...");

            // Get the contents of the source files
            sources = fetchSources(options.source, options.hasOwnProperty("recurse"),
                options.includePattern && new RegExp(options.includePattern),
                options.excludePattern && new RegExp(options.excludePattern));

            console.info(sources.length + (sources.length > 1 ? " files" : " file") + " preprocessed.");
            console.timeEnd("Preprocessing time");
        }
    };

    module.exports.cli();
})();