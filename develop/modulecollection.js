/**
 * This module defines the `Module` and the collection of modules as `ModuleCollection`. The classes allows easy
 * dependency calculation of modules.
 * @module jslinker.modulecollection
 *
 * @requires jslinker.lib
 */
var PATH = "path",
    lib = require("./lib.js"),
    ModuleCollection;

ModuleCollection = function () {
    /**
     * Stores all modules
     * @type {Object<ModuleCollection.Module>}
     * @private
     */
    this.modules = {}; // unique
    /**
     * Stores the path pf all source files
     * @type {Object<ModuleCollection.Module>}
     * @private
     */
    this.sources = {}; // unique

    /**
     * Stores all connections
     */
    this.dependencies = [];
};

lib.copy(ModuleCollection.prototype, {
    /**
     * Get a new module from collection and if it does not exist, create one.
     *
     * @param {string} name -
     * @param {boolean=} [anyway] -
     * @returns {ModuleCollection.Module}
     */
    get: function (name, anyway) {
        return this.modules[(name = lib.stringLike(name))] || anyway &&
            (this.modules[name] = new ModuleCollection.Module(name));
    },

    /**
     * Gets a node by it's source file name.
     *
     * @param {string} value [description]
     * @returns {ModuleCollection.Module} [description]
     */
    getByValue: function (value) {
        return this.sources[value];
    },

    /**
     * Add a new module to the collection
     *
     * @param {string} name
     * @param {string} valuevalue
     * @returns {ModuleCollection.Module}
     */
    add: function (name, valuevalue) {
        return (this.recentmodule = this.get(name, true).define(valuevalue)) &&
            (this.sources[this.recentmodule.valuevalue] = this.recentmodule);
    },

    /**
     * Marks one module as dependency of the other.
     *
     * @param {[type]} name [description]
     * @param {[type]} dependency [description]
     * returns {[type]} [description]
     */
    connect: function (name, dependency) {
        return (this.dependencies.push((this.recentdependency =
            new ModuleCollection.Dependency(this.get(name, true), this.get(dependency, true)))), this.recentdependency);
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

ModuleCollection.Dependency = function (module, dependant) {
    // Mark the dependency within modules.
    this.module = module.needs(this.dependant = dependant, true);
    // Store the dependency within both the connected modules.
    module.connections.push(this);
    dependant.connections.push(this);
};

ModuleCollection.Module = function (name, value) {
    /**
     * @type {string}
     */
    this.name = lib.stringLike(name);

    // Validate the name to not be blank.
    if (!this.name) {
        throw "Module name cannot be blank.";
    }

    this.degree = 0;

    /**
     * Stores all depencies.
     * @type {Object<ModuleCollection.Module>}
     */
    this.dependants = {};

    /**
     * Stores all connections
     * @type {Array}
     */
    this.connections = [];

    // Define the node if passed as part of constructor.
    value && this.define(value);
};

lib.copy(ModuleCollection.Module.prototype, {

    /**
     * Modules can be created and yet be not marked as defined. Definition takes place only when a value is passed to
     * it - usually the source path.
     */
    define: function (value) {
        // Redefinition is not allowed.
        if (this.hasOwnProperty(PATH)) {
            throw lib.format("Module {0} is already defined.", this.name);
        }
        this.path = lib.stringLike(value); // store
        return this; // chain
    },

    /**
     * Check whether the module has been defined formally. Modules can be created and yet be not marked as defined.
     */
    defined: function () {
        return this.hasOwnProperty(PATH);
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
        if (this.dependants[name]) {
            throw lib.format("Dependency \"{0}\" is already defined for {1}.", name, this.name);
        }

        this.dependants[name] = module;
        module.degree++;

        return this; // chain
    },

    toString: function () {
        return this.name;
    }
});


// Functions to analyse the collection.
ModuleCollection.analysers = [function (stat) {
    var module;

    stat.orphanModules = [];
    stat.definedModules = [];

    for (var prop in this.modules) {
        module = this.modules[prop];
        stat[module.defined() ? "definedModules" : "orphanModules"].push(module);
    }
}];

module.exports = ModuleCollection;