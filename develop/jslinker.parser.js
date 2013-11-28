/**
 * @module jslinker.parser
 * @requires jslinker.lib
 * @requires jslinker.filemeta
 * @requires jslinker.digraph
 */

var lib = require("./jslinker.lib.js"),
    FileMeta = require("./jslinker.filemeta.js"),
    Graph = require("./jslinker.digraph.js");

module.exports = {

    start: function (options, callback) {
        var g,
            modules;

        g = this.fetch(options.source, options.recursive, options.includePattern, options.excludePattern,
            options.verbose);
        modules = this.compute(g, options.output);
        callback(null, g);

    },

    /**
     * Process a list of source files - fetch all file contents and determine the module definitions and requirements
     * within each.
     *
     * @param {string|Array<string>} sourceFiles - List of input files
     * @param {boolean=} [recursive=false] - Specify to whether recursively process files when the input specifies
     * directories.
     * @param {RegExp=} [includePattern] - Regular Expression to validate whether an input file is
     * to be accepted for parsing or not. Very useful to limit to file types, etc.
     * @param {RegExp=} [excludePattern] - Regular Expression to match file names that invalidates
     * them from being included while processing directories or files as sources.
     *
     * returns {Array<FileMetae>} - Get access to all the sources processed from the given parameters.
     */
    fetch: function (sourceFiles, recursive, includePattern, excludePattern, verbose) {
        var g = new Graph(),
            meta;


        lib.forEachFileIn(sourceFiles, function (path, name) {
            if (excludePattern && excludePattern.test(name)) {
                return;
            }
            if (includePattern && !includePattern.test(name)) {
                return;
            }

            file = new FileMeta(path, true);

            file.modules.forEach(function (module) {
                g.addVertex(module, file.path);
                file.requires.forEach(function (requires) {
                    g.addEdge(module, requires);
                });
            });

            if (verbose) {
                console.log(name);
                console.log("    modules ->", file.modules);
                console.log("    requires ->", file.requires);
            }
        }, recursive);
        return g;
    },

    compute: function (g, output) {
        var lead = g.vertices["jslinker"];
    },

    flatten: function (modules, output) {

    }
};