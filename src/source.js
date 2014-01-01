/**
 * Source file parser. Allows managed parsing of source files using AST.
 *
 * @module source
 * @requires lib
 */

var E = "",
    BLOCK = "Block",
    ASTERISK = "*",
    SPC = " ",

    lib = require("./lib.js"),
    fs = require("fs"),
    esprima = require("esprima"),
    esprimaOptions = {
        comment: true,
        range: true
    },
    Source; // constructor


/**
 * The class allows parsing of Mozilla compatible AST from a source file and then perform operations on the tree as a
 * part of process, verification or for output.
 *
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

    parseDirectives: function (directives, order, scope) {
        var comments = this.ast && this.ast.comments || [];

        // If the order is not specified or parially specified, then create one. This is the order of parsing the
        // directives.
        order = lib.orderedKeys(directives, Array.isArray(order) ? order : [], (/^function$/));

        comments.forEach(function (comment) {
            var returns = [{}]; // we store it as array of object so that it can be concatenated with arguments
            // Only continue if its a block comment and starts with jsdoc syntax. Also prevet blocks having @ignore
            // tags from being parsed.
            if (comment.type !== BLOCK || comment.value.charAt() !== ASTERISK ||
                /\@ignore[\@\s\r\n]/ig.test(comment.value)) {
                return;
            }

            // Pass the directives in given order
            order.forEach(function (directive) {
                var tokens = directive.split(SPC), // split the token to extract the directives
                    name = tokens[0], // get the first token constant as name
                    evaluator = directives[name]; // fetch the directive parser

                // Call the directive replacer function and then pass the evaluator via a router
                comment.value.replace(lib.getDirectivePattern(name), (function () {
                    return function ($glob, $1) {
                        if ($1 && ($1 = $1.trim())) {
                            // Execute the evaluator in the specified scope and send it a very specific argument set
                            // 1: namespace, 2+: all the specific matches of the name pattern
                            returns[0][name] = evaluator.apply(scope,
                                returns.concat(Array.prototype.slice.call(arguments, 1, -2)));
                        }
                    };
                }())); // end comment replacer callback
            }); // end order forEach
        }); // end comment forEach
    }
});

module.exports = Source;