/**
 * @module jslinker.modulecollection
 * @requires jslinker.lib
 */
var E = "",
    BLOCK = "Block",
    ASTERISK = "*",
    VALUE = "value",
    DEFAULT_INCLUDE_PATTERN = /.+\.js$/,
    DEFAULT_EXCLUDE_PATTERN = /^$/,
    DEFAULT_DEFINE_TAG_PATTERN = /\@module\s*([^\@\r\n]*)/ig,
    DEFAULT_INCLUDE_TAG_PATTERN = /\@requires\s*([^\@\r\n]*)/ig,

    lib = require("./jslinker.lib.js"),
    fs = require("fs"),
    pathUtil = require("path"),
    walkdir = require("walkdir"),
    esprima = require("esprima"),
    ModuleCollection;

ModuleCollection = function () {
    this.modules = {};
};

lib.copy(ModuleCollection.prototype, {
    /**
     * Get a new module from collection and if it does not exist, create one.
     *
     * @param {[type]} name [description]
     * @returns {[type]} [description]
     */
    get: function (name) {
        return this.modules[(name = lib.stringLike(name))] || (this.modules[name] = new ModuleCollection.Module(name));
    },

    /**
     * Add a new module to the collection
     *
     * @param {[type]} name [description]
     * @param {[type]} path [description]
     */
    add: function (name, value) {
        return this.get(name).define(value);
    },

    /**
     * Marks one module as dependency of the other.
     *
     * @param {[type]} name [description]
     * @param {[type]} dependency [description]
     * returns {[type]} [description]
     */
    connect: function (name, dependency) {
        return this.get(name).needs(this.get(dependency));
    },

    /**
     * Analyse the collection and return statistics. This is performance intensive for very large collection, hence it
     * is suggested to be cached during re-use.
     */
    analyse: function () {
        var stat = {},
            i,
            ii;
        // Execute all the analysers over this stats object.
        for (i = 0, ii = ModuleCollection.analysers.length; i < ii; i++) {
            ModuleCollection.analysers[i].call(this, stat);
        }
        return stat;
    }
});

ModuleCollection.Module = function (name, value) {
    this.name = lib.stringLike(name);
    value && this.define(value);
    this.requires = {};

    // Validate the name to not be blank.
    if (!this.name) {
        throw "Module name cannot be blank";
    }
};

// Functions to analyse the collection.
ModuleCollection.analysers = [];

lib.copy(ModuleCollection.Module.prototype, {
    /**
     * Modules can be created and yet be not marked as defined. Definition takes place only when a value is passed to
     * it - usually the source path.
     */
    define: function (value) {
        // Redefinition is not allowed.
        if (this.hasOwnProperty(VALUE)) {
            throw lib.format("Module {0} is already defined.", this.name);
        }
        this.value = lib.stringLike(value); // store
        return this; // chain
    },

    /**
     * Check whether the module has been defined formally. Modules can be created and yet be not marked as defined.
     */
    defined: function () {
        return this.hasOwnProperty(VALUE);
    },

    /**
     * Mark a module to be needed by this module as dependency.
     */
    needs: function (module) {

        var name;

        // Validate that input parameter is a module.
        if (!(module instanceof ModuleCollection.Module)) {
            throw "A module can only require other modules!";
        }

        // Get a validated variant of the module name.
        name = module.name;

        // Module cannot depend on itself and it cannot add a dependency already added.
        if (name === this.name) {
            throw lib.format("Module {0} cannot depend on itself!", name);
        }

        // Module cannot have repeated definitions.
        if (this.requires[name]) {
            throw lib.format("Dependency \"{0}\" is already defined for {1}.", name, this.name);
        }

        this.requires[name] = module;

        return this; // chain
    },

    toString: function () {
        return this.name;
    }
});

ModuleCollection.loadFromFile = function (collection, path, recurse, include, exclude) {
    var esprimaOptions = { // we define it outside to avoid redefinition in loop.
            comment: true
        };
    // Ensure that collection is really a ModuleCollection
    if (!(collection instanceof this)) {
        throw "Only a ModuleCollection instance can be populated by ModuleCollection";
    }

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
        // Extract the name to apply io patterns on. The patterns will not work out if full path is passed to pattern
        // matching.
        fileName = pathUtil.basename(path);
        if (exclude.test(fileName) || !include.test(fileName)) {
            return;
        }

        // We increment the error counter here and would decrement later when all goes well.
        collection._statFilesError++;

        // Since parsing might have error, but that needs to be trapped to return error report. Thus, we wrap it inside
        // a try block.
        try {
            // While calling esprima, we set `comments: true` to get the list of comments in code.
            comments = esprima.parse((fs.readFileSync(path) || E).toString(), esprimaOptions).comments || [];
        }
        catch (err) {
            throw lib.format("{1}\n> {0}", path, err.message);
        }

        // This function is passed to the replacer function to excavate the module name from the module definition line
        // and then add it to the collection. This is defined here to avoid overhead of redefinition within a loop.
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

        // This function adds dependencies for a module that has been discovered. This is defined here to avoid repeated
        // definition within loop.
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

            // Only continue if its a block comment and starts with jsdoc syntax.
            if (comment.type !== BLOCK || comment.value.charAt() !== ASTERISK) {
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
};

/**
 * function to calculate defined and orphaned modules.
 */
ModuleCollection.analysers.push(function (stat) {
    stat.orphanModules = 0;
    stat.definedModules = 0;

    for (var prop in this.modules) {
        stat.orphanModules++; // assume orphan unless detected to be defined.
        if (this.modules[prop].defined()) {
             stat.definedModules++;
             stat.orphanModules--; // since defined, no longer orphan.
        }
    }
});

/**
 * Function to add file parsing statistics to collection.
 */
ModuleCollection.analysers.push(function (stat) {
    stat.filesTotal = this._statFilesTotal;
    stat.filesProcessed = this._statFilesProcessed;
    stat.filesIgnored = this._statFilesTotal - this._statFilesProcessed - this._statFilesError;
});

module.exports = ModuleCollection;