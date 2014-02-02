/**
 * This module contains all the helper and library functions that are required by various modules of `jslink`.
 * @module lib
 */
var E = "",
    SPC = " ",
    BLOCK = "Block",
    ASTERISK = "*",
    PLURAL_SUFFIX = "s",
    STRING  = "string",
    OBJECT = "object",
    FUNCTION = "function",
    SLASH = "/",
    DOTSLASH = "./",

    fs = require("fs"),
    pathUtil = require("path"),

    lib;

module.exports = lib = /** @lends module:lib */ {

    /**
     * Adds the character `s` to the contents of the `word` parameter. This method is helpful to show messages that are
     * in tune with the value of a number.
     *
     * @param {number} num
     * @param {string} word
     * @returns {string}
     */
    plural: function(num, word) {
        return num + SPC + ((num > 1 || num < -1) && (word += PLURAL_SUFFIX), word);
    },

    /**
     * Simple format function. Replaces construction of type “`{<number>}`” to the corresponding argument.
     *
     * @param {string} token
     * @param {...string} params
     * @returns {string}
     */
    format: function(token, params) {
        var args = Array.isArray(params) ? [0].concat(params) : arguments;
        token && (typeof token === STRING) && args.length - 1 && (token = token.replace(/\{(\d+)\}/g, function(str, i) {
            return args[++i] === null ? E : args[i];
        }));
        return token || E;
    },

    /**
     * Replaces a block of array of strings with a replacement array of string. In case replacement array is shorter,
     * it fills with default character.
     *
     * @param {Array} array
     * @param {string|Array} replacement
     * @param {Array<number>} [loc]
     * @param {string=} [defaultChar]
     * @returns {Array}
     */
    fillStringArray: function (array, replacement, loc, defaultChar) {
        var i,
            j,
            ii,
            jj;

        // If replacement is a string then convert to an array.
        if (!Array.isArray(replacement)) {
            replacement = replacement && replacement.toString && replacement && replacement.toString().split(E) || [];
        }

        for (i = loc[0], ii = loc[1], j = 0, jj = replacement.length; i < ii; i++, j++) {
            array[i] = (j < jj ? replacement[j] : (defaultChar || array[i]));
        }

        return array;
    },

    /**
     * [trimStringArray description]
     * @param {[type]} array [description]
     * @param {Array<number>} loc
     * @param {RegExp} regex
     * @returns {Array}
     */
    trimStringArray: function (array, loc, regex) {
        var i,
            ii;

        // left trim
        for (i = loc[0] - 1, ii = 0; i >= ii; i--) {
            if ((regex || /[\s\r\n]/).test(array[i])) {
                array[i] = E;
            }
            else {
                break;
            }
        }
        // right trim
        for (i = loc[1] + 1, ii = array.length; i < ii; i++) {
            if ((regex || /[\s\r\n]/).test(array[i])) {
                array[i] = E;
            }
            else {
                break;
            }
        }

        return array;
    },

    /**
     * Get string from string-like objects.
     *
     * @param {*} str
     * @returns {string}
     *
     * @throws {TypeError} If the `str` parameter passed is `null` or `undefined` or does not have a `toString` method.
     */
    stringLike: function (str) {
        // Module name has to be valid and cannot be blank.
        if (!(str ? typeof str.toString === FUNCTION : typeof str === STRING)) {
            throw new TypeError("Not a valid string: " + str);
        }
        // Sanitise the name for further processing - like trim it!
        return str.toString().trim();
    },

    /**
     * Copy all properties of source to sink.
     *
     * @param {object} sink
     * @param {object} source
     * @returns {object}
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
     * @param {object} sink
     * @param {object} source
     * @returns {object}
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
     * @param {Array} args
     * @param {string=} [don] - The default option to which to append all stray options
     * @returns {object}
     */
    argsArray2Object: function (args, don) {
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

            if (/^\-\-[^\-]*/g.test(arg)) {
                arg.replace(/^\-\-([a-z]*)\=?([\s\S]*)?$/i, replacer);
            }
            // In case it is not an option object, we add it to default option name.
            else if (don) {
                out.hasOwnProperty(don) && (out[don].push ? out[don] : (out[don] = [out[don]])).push(arg) ||
                    (out[don] = arg);
            }
        }
        return out;
    },

    /**
     * Checks whether a path starts with or contains a hidden file or a folder.
     *
     * @param {string} source - The path of the file that needs to be validated.
     * @returns {boolean} `true` if the source is blacklisted and otherwise `false`.
     */
    isUnixHiddenPath: function (path) {
        return (/(^|.\/)\.+[^\/\.]/g).test(path);
    },

    /**
     * Tests whether a path is a directory or possibly a file reference.
     *
     * @param {string} path
     * @returns {boolean}
     */
    isUnixDirectory: function (path) {
        return (/(^\.{1,2}$)|(\/$)/).test(path);
    },

    /**
     * Return the JSON data stored in a file.
     *
     * @param {string} path Is always relative
     * @returns {object}
     */
    readJSONFromFile: function (path) {
        try {
            path = DOTSLASH + path;
            return JSON.parse(fs.readFileSync(path));
        }
        catch (error) {
            throw new Error(lib.format("Unable to read file: {0}\n{1}", path, error));
        }
    },

    /**
     * Iterate over an object and convert all string properties of the object into native boolean values.
     *
     * @param {object} obj
     * @param {Array} properties
     * @returns {object}
     */
    parseJSONBooleans: function (obj, properties) {
        // Check whether parameters are valid
        if ((typeof obj === OBJECT) && Array.isArray(properties) && properties.length) {
            properties.forEach(function (prop) {
                if (obj.hasOwnProperty(prop)) {
                    obj[prop] = !(/^\s*false\s*$/ig.test(obj[prop]));
                }
            });
        }
        return obj;
    },

    /**
     * Caches function call returns
     * @param {[type]} f function whose arguments cannot contain Objects and the return value is dependent on the
     * arguments
     * @param {[type]} scope the scope in which the function should be executed
     * @returns {[type]} a cached function f which returns the cached value for same arguments
     */
    cacher: function (f, scope) {
        function cachedfunction() {
            var arg = Array.prototype.slice.call(arguments, 0),
                args = arg.join("\u2400"),
                cache = cachedfunction.cache = cachedfunction.cache || {},
                count = cachedfunction.count = cachedfunction.count || [],
                i,
                ii;

            if (cache.hasOwnProperty(args)) {
                for (i = 0, ii = count.length; i < ii; i++) {
                    if (count[i] === args) {
                        count.push(count.splice(i, 1)[0]);
                        break;
                    }
                }
                return cache[args];
            }
            count.length >= 1e3 && delete cache[count.shift()];
            count.push(args);
            cache[args] = f.apply(scope, arg);
            return cache[args];
        }
        return cachedfunction;
    },

    /**
     * Generate a directive parsing Regular Expression from a directive name
     *
     * @param {string} directive
     * @returns {RegExp}
     */
    getDirectivePattern: function (directive) {
        return new RegExp(lib.format("\\@{0}[\\s\\n\\r]+([^\\@\\r\\n]*)", directive), "ig");
    },

    /**
     * Takes in a comment AST block as parameter and returns whether it is a valid jsdoc block
     * @param {object} comment
     * @param {boolean} ignoreignore
     */
    isJSDocBlock: function (comment, ignoreIgnore) {
        return !(comment.type !== BLOCK || comment.value.charAt() !== ASTERISK ||
            ((!ignoreIgnore) && /\@ignore[\@\s\r\n]?/ig.test(comment.value)));
    },

    /**
     * Returns the keys of an object in a specific order and optionally filtered by a type.
     *
     * @param {[object} object
     * @param {Array<string>} reference
     * @param {RegExp=} [type]
     * @returns {Array}
     */
    orderedKeys: function (object, reference, type) {
        var order = [],
            flag = {};

        // If there is no object, there is no order!
        if (typeof object !== OBJECT) {
            throw new Error("Cannot prepare ordered key for non-object variables.");
        }

        // Validate type parameter
        if (!type || (typeof type.test !== FUNCTION)) {
            type = /./g;
        }

        // Concatenate object keys and reference. Reference first and the prepare the final order array.
        ([].concat(reference).concat(Object.keys(object))).map(function (key) {
            // add to the order only if not duplicate and exists in object
            if (object.hasOwnProperty(key) && !flag[key] && type.test(typeof object[key])) {
                this.push(key);
                flag[key] = true;
            }
        }, order);

        return order;
    },

    /* jshint maxcomplexity: 15 */
    /**
     * @todo reduce complexity of these functions.
     */
    /**
     * Procures a writeable file.
     *
     * @param {string} path
     * @param {string} defaultPath
     * @param {boolean=} [overwrite]
     * @param {boolean=} [nocreate]
     * @param {boolean=} [clear]
     * @returns {string}
     */
    writeableFile: function (path, defaultPath, overwrite, nocreate, clear) {
        var originalPath = path; // store it for future references.

        // In case path comes from cli input and is equal to boolean true, then proceed with default.
        if (path === true) {
            originalPath = path = defaultPath;
        }

        // Validate parameters so as to ensure that the path and the alternative defaults can be processed.
        if (!path || !defaultPath) {
            throw new TypeError("Path cannot be blank.");
        }
        else if (lib.isUnixDirectory(path)) {
            throw new TypeError(lib.format("Path \"{0}\" cannot be a directory.", path));
        }
        else if (lib.isUnixHiddenPath(path)) {
            throw new TypeError(lib.format("Cannot output to hidden file \"{0}\".", path));
        }
        else if (lib.isUnixDirectory(defaultPath)) {
            throw new TypeError("Path (default) cannot be a directory.");
        }

        // In case the output path is a directory, use the filename from default path.
        if (lib.isUnixDirectory(path)) {
            path += pathUtil.basename(defaultPath); // add file name if path is a directory
        }
        // Resolve the path to absolute reference
        path = pathUtil.resolve(path.toString());

        // If the path provided exists, the only check should be that it is a file and a not a directory. If its a
        // directory, then append default file name;
        if (fs.existsSync(path)) {
            // In case the final file does point to an existing file, we need to check whether overwriting is permitted
            // or not.
            if (fs.statSync(path).isFile()) {
                if (overwrite === false) {
                    throw new Error(lib.format("Cannot overwrite \"{0}\"", originalPath));
                }
                else if (clear) {
                    fs.writeFileSync(path, E);
                }
            }
            // Otherwise... it is either a directory or the world's end!
            else {
                throw new TypeError(lib.format("The output path \"{0}\" does not point to a file.", originalPath));
            }
        }
        // When file does not exist then we would need to create the directory tree (if provided and allowed)
        else {
            // Ensure that the path has a writeable folder (if permitted) till its parent directory.
            lib.writeableFolder(pathUtil.dirname(path) + SLASH, pathUtil.dirname(defaultPath) + SLASH);
            // We create the file so that it can be further used to write or append.
            if (!nocreate) {
                clear === true ? fs.writeFileSync(path, E) : fs.openSync(path, "w");
            }
        }

        return path; // the valid path
    },

    /**
     * Takes in user provided path and returns a writeable path for the same.
     *
     * @param {string} path
     * @param {string} default
     * @returns {string}
     */
    writeableFolder: function (path, defaultPath) {
        var originalPath = path,
            dirlist,
            dir;

        // In case path comes from cli input and is equal to boolean true, then proceed with default.
        if (path === true) {
            path = defaultPath;
        }

        // Validate parameters so as to ensure that the path and the alternative defaults can be processed.
        if (!defaultPath) {
            throw new TypeError("Path cannot be blank.");
        }
        else if (!path) {
            path = defaultPath;
        }

        if (!lib.isUnixDirectory(path)) {
            throw new TypeError(lib.format("Path \"{0}\" cannot be a file."), path);
        }
        else if (lib.isUnixHiddenPath(path)) {
            throw new TypeError(lib.format("Cannot output to hidden file \"{0}\"."), path);
        }
        else if (!lib.isUnixDirectory(defaultPath)) {
            throw new TypeError("Path (default) cannot be a file.");
        }

        path = pathUtil.resolve(path.toString());

        dirlist = [];
        dir = path;

        // Extract directories within the path that does not exist.
        while (dir !== SLASH) {
            if (fs.existsSync(dir)) {
                // Check whether the last existing member of the dir tree is not a file.
                if (!fs.statSync(dir).isDirectory()) {
                    throw new Error(lib.format("Cannot write to \"{0}\" since \"{1}\" is not a directory.",
                        originalPath, dir));
                }
                break;
            }
            dirlist.push(dir);
            dir = pathUtil.dirname(dir);
        }
        // We now slowly create the directories recovered from the above loop.
        while (dir = dirlist.pop()) {
            fs.mkdirSync(dir); // let any error bubble.
        }

        return (/\/$/).test(path) ? path : path + SLASH;
    },

    /**
     * This function outputs to console based on jslink global verbose mode
     * @param {string} what - The message to log.
     * @param {boolean=} [important=] - Show message even when not verbose but hide when quiet
     */
    log: function (what, important) {
        (important && !global.jslinkQuiet || global.jslinkVerbose) &&
        (what = (typeof what === FUNCTION ? what() : what.toString())) && console.log(what);
    }
};
