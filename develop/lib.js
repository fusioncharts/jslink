/**
 * This module contains all the helper and library functions that are required by various modules of `jslinker`.
 * @module jslinker.lib
 */
var E = "",
    SPC = " ",
    PLURAL_SUFFIX = "s",
    STRING  = "string",
    FUNCTION = "function",
    lib;

module.exports = lib = {

    /**
     * Returns `s` if plural else blank
     */
    plural: function (num, word) {
        return num + SPC + (num > 1 && (word += PLURAL_SUFFIX), word);
    },

    /**
     * Simple format function. Replaces construction of type “`{<number>}`” to the corresponding argument.
     */
    format: function(token, params) {
        var args = Array.isArray(params) ? [0].concat(params) : arguments;
        token && (typeof token === STRING) && args.length - 1 && (token = token.replace(/\{(\d+)\}/g, function(str, i) {
            return args[++i] === null ? E : args[i];
        }));
        return token || E;
    },

    /**
     * Get string from string-like objects.
     */
    stringLike: function (str) {
        // Module name has to be valid and cannot be blank.
        if (!(str && typeof str.toString === FUNCTION)) {
            throw "Not a valid string: " + str;
        }
        // Sanitise the name for further processing - like trim it!
        return str.toString().trim();
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
            replacer,
            arg;

        // This function is sent to the .replace function on argument values in order extract its content as key=value
        // pairs. Defined here to prevent repeated definition within loop.
        replacer = function ($glob, $1, $2) {
            // In case the value is undefined, we set it to boolean true
            ($2 === undefined) && ($2 = true);

            // If the option already exists, push to the values array otherwise create a new values array. In case
            // this option was discovered for the first time, we pust it as a single item of an array.
            out.hasOwnProperty($1) && (out[$1].push ? out[$1] : (out[$1] = [out[$1]])).push($2) || (out[$1] = $2);
        };

        // Loop through arguments and prepare options object.
        while (arg = args.shift()) {
            arg.replace(/^\-\-([a-z]*)\=?([\s\S]*)?$/i, replacer);
        }
        return out;
    },

    /**
     * Checks whether a path starts with or contains a hidden file or a folder.
     *
     * @param {string} source - The path of the file that needs to be validated.
     * returns {boolean} - `true` if the source is blacklisted and otherwise `false`.
     */
    isUnixHiddenPath: function (path) {
        return (/(^|.\/)\.+[^\/\.]/g).test(path);
    }
};