/**
 * @module jslinker.filemeta
 * @requires jslinker.lib
 */

var E = "",
    lib = require("./jslinker.lib.js"),
    fs = require("fs"),
    esprima = require("esprima"),
    isArray = Array.isArray,
    FileMeta;

/**
 * Define a source file that needs to be pre-processed.
 * @constructor
 *
 * @param {string} path - The path of the file that will be pre-processed. This needs to be pre-validated to be
 * a single file and must exist and be readable.
 * @param {boolean=} [parse=true] - Parse on instantiation or wait for {@link FileMeta#parse} be executed.
 */
FileMeta = function (path, parse) {
    this.path = path || this.path;
    this[(parse === false ? "reset" : "parse")]();
};

FileMeta.tags = [{
    name: "modules",
    tag: "module"
}, {
    name: "requires",
    tag: "requires"
}];

lib.copy(FileMeta.prototype, /** @memberOf FileMeta# */ {
    /**
     * Reset all values of the file meta instance.
     */
    reset: function () {
        this.parsed = false;
        FileMeta.tags.forEach(function (item) {
            var name = item.name;
            if (isArray(this[name])) {
                this[name].length = 0;
            }
            else {
                this[name] = [];
                item._regex = new RegExp("\\@" + item.tag + "\\s*([^\\@]*)", "ig");
            }
        }, this);
    },

    /**
     * Parses the raw content of a {@link FileMeta} and extracts the module definitions and dependencies as provided
     * by jsDoc comment tags.
     * returns {boolean} - `true` when the file has been successfully parsed or `false` in case of parse failure.
     */
    parse: function () {
        var meta = this,
            comments;

        // Mark that the parse status is false.
        this.parsed = false;

        // Since parsing might have error, but that needs to be trapped to return error report. Thus, we wrap it inside
        // a try block.
        try {
            // While calling esprima, we set `comments: true` to get the list of comments in code.
            comments = esprima.parse((this.path && fs.readFileSync(this.path) || E).toString(), {
                comment: true
            }).comments;
        }
        catch (err) {
            return false;
        }

        // Reset the dependency and definition declarations for the file.
        this.reset();

        // We iterate over each comment block and process them. This area is memory-leak prone and as such care must be
        // // taken while referencing variables.
        comments.forEach(function (comment) {
            if (comment.type === "Block" && comment.value.charAt() === "*") {
                FileMeta.tags.forEach(function (item) {
                    comment.value.replace(item._regex, function ($glob, $1) {
                        meta[item.name].push($1.replace(/\r?\n\ *\*/, E).trim());
                    });
                });
            }
        });

        // Set parse status to true.
        this.parsed = true;
        return true;
    }
});

module.exports = FileMeta;