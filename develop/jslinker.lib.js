/**
 * @module  jslinker.lib
 */

const E = "",
    SPC = " ",
    PLURAL_SUFFIX = "s",
    STRING  = "string";

var fs = require("fs"),
    path = require("path"),
    lib;

module.exports = lib = {

    /**
     * Returns `s` if plural else blank
     */
    plural: function (num, word) {
        return num + SPC + (num > 1 && (word += PLURAL_SUFFIX), word);
    },

    /**
     * Copy all properties of source to sink.
     *
     * @param {object} sink -
     * @param {object} source -
     * returns {object}
     */
    copy: function (sink, source) {
        for (var prop in source) {
            sink[prop] = source[prop];
        }
        return sink;
    },

    /**
     * Copies all new properties from source to sink.
     *
     * @param {object} sink -
     * @param {object} source -
     * returns {object}
     */
    fill: function (sink, source) {
        for (var prop in source) {
            !sink.hasOwnProperty(prop) && (sink[prop] = source[prop]);
        }
        return sink;
    },

    /**
     * Converts an arguments array (usually from CLI) in format similar to Closure Compiler and returns an object of
     * options.
     *
     * @param {Array} args -
     * returns {object}
     */
    argsArray2Object: function (args) {
        var out = {},
            arg;
        // Loop through arguments and prepare options object.
        while (arg = args.shift()) {
            arg.replace(/^\-\-([a-z]*)\=?([\s\S]*)?$/i, function ($glob, $1, $2) {
                // In case the value is undefined, we set it to boolean true
                ($2 === undefined) && ($2 = true);

                // If the option already exists, push to the values array otherwise create a new values array. In case
                // this option was discovered for the first time, we pust it as a single item of an array.
                out.hasOwnProperty($1) && (out[$1].push ? out[$1] : (out[$1] = [out[$1]])).push($2) || (out[$1] = $2);
            });
        }
        return out;
    },

    /**
     * Checks whether a source file or directory is blacklisted from access. Usually these are hidden or system files
     * name starting with a dot.
     * @param {string} source - The path of the file that needs to be validated.
     * returns {boolean} - `true` if the source is blacklisted and otherwise `false`.
     */
    isUnixHiddenPath: function (path) {
        return /^\.+[^\/\.]/g.test(path);
    },

    /**
     * Iterate over a bunch of paths and execute a callback whenever a valid file is encountered.
     * @param {string|Array<string>} sources - Files or directories that needs to be treated as input files.
     * @param {function} callback - Callback function that is executed whenever a files is encountered. The first
     * argument passed to the callback is the full file path (relative) and the second parameter is the file name.
     * @param {boolean=} [recursive] - A flag that sets whether to recursively look into the directories provided as
     * sources.
     */
    forEachFileIn: function (sources, callback, recursive) {
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
            if (!lib.isUnixHiddenPath(source) && fs.existsSync(source)) {
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
                        if (!lib.isUnixHiddenPath(name) && fs.existsSync(item = path.join(source, name))) {
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
                                lib.forEachFileIn(item, callback, recursive);
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
    }
};