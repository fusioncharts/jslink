/**
 * Source file parser. Allows managed parsing of source files using AST.
 *
 * @module source
 * @requires lib
 */

var E = "",
    BLOCK = "Block",
    ASTERISK = "*",

    lib = require("./lib.js"),
    fs = require("fs"),
    esprima = require("esprima"),
    esprimaOptions = {
        comment: true,
        range: true
    },
    /**
     * Generate a directive parsing Regular Expression.
     *
     * @param {string} directive
     * @returns {RegExp}
     */
    getDirectivePattern = function (directive) {
        return new RegExp(lib.format("\\@{0}\\s*([^\\@\\r\\n]*)", directive), "ig");
    },
    Source; // constructor


/**
 * @constructor
 * @param {string} path
 */
Source = function (path) {
    /**
     * @type {string}
     */
    this.path = path;

    // Since parsing might have error, but that needs to be trapped to return error report. Thus, we wrap it
    // inside a try block.
    try {
        /**
         * @type {string}
         */
        this.raw = fs.readFileSync(path).toString() || E;

        /**
         * @type {object}
         */
        this.ast = esprima.parse(this.raw, esprimaOptions) || {
            comments: []
        };
    }
    catch (err) {
        throw lib.format("{1}\n> {0}", path, err.message);
    }
};

lib.copy(Source.prototype, /** @lends module:source~Source.prototype */ {
    toString: function () {
        return this.path;
    },

    /**
     * Parses the directives from the codes AST
     *
     * @param {string} alphaDirective
     * @param {function} alphaDirectiveCallback
     * @param {object<function>} betaDirectives
     */
    parseDirectives: function (alphaDirective, alphaDirectiveCallback, betaDirectives) {
        var comments = this.ast.comments,
            directiveCache = {},
            directive,
            alphaParam,
            alphaRouter, // function
            getBetaRouter, // function
            added, // flag to stop duplicate addition
            i,
            ii;

        // Check whether any beta directive conflicts with alpha
        if (betaDirectives && betaDirectives.hasOwnProperty(alphaDirective)) {
            throw lib.format("Conflicting alpha and beta directives: {0}", alphaDirective);
        }

        // This function is passed to the replacer function to excavate the module name from the module definition
        // line and then add it to the collection. This is defined here to avoid overhead of redefinition within a
        // loop.
        alphaRouter = function ($glob, $1) {
            // Extract the value of the token.
            if ($1 && ($1 = $1.trim())) {
                // In case token has been already been defined, we know that it is a repeated module definition
                // and warn the same.
                if (added) {
                    throw lib.format("Repeated module definition encountered in single block. " +
                        "{0} dropped in favour of {1}", $1, added);
                }
                // Only accept the first definition
                // store the module name for subsequent use within this loop.
                /** @todo document that callback return values reused for discovery and export) */
                alphaParam = alphaDirectiveCallback(added = $1);
            }
        };

        // This function adds dependencies for a module that has been discovered. This is defined here to avoid
        // repeated definition within loop.
        getBetaRouter = function (directive) {
            return (directiveCache[directive] || (directiveCache[directive] = function ($glob, $1) {
                // Extract the value of the token.
                if ($1 && ($1 = $1.trim())) {
                    betaDirectives[directive]($1, alphaParam); /** @todo document */
                }
            }));
        };

        // Apply the directive parsing on each comment block
        comments.forEach(function (comment) {
            // reset lock for parsing modules in string replace functions
            alphaParam = undefined;
            added = undefined;

            // Only continue if its a block comment and starts with jsdoc syntax. Also prevet blocks having @ignore
            // tags from being parsed.
            if (comment.type !== BLOCK || comment.value.charAt() !== ASTERISK ||
                /\@ignore[\@\s\r\n]/ig.test(comment.value)) {
                return;
            }
            // Search for a module definition in it.
            comment.value.replace(getDirectivePattern(alphaDirective), alphaRouter);
            // We need to search for dependencies only if a module name has been discovered.
            if (added) {
                for (directive in betaDirectives) {
                    comment.value.replace(getDirectivePattern(directive), getBetaRouter(directive));
                }
            }
        });

    }
});

module.exports = Source;