/**
 * @module jslinker.modulecollection
 * @requires jslinker.lib
 */
var VALUE = "value",

    lib = require("./jslinker.lib.js"),
    ModuleCollection;

ModuleCollection = function () {
    this.modules = {}; // unique
    this.values = {}; // unique
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

    getByValue: function (value) {
        return this.values[value];
    },

    /**
     * Add a new module to the collection
     *
     * @param {[type]} name [description]
     * @param {[type]} path [description]
     */
    add: function (name, value) {
        return (this.recentmodule = this.get(name, true).define(value)) &&
            (this.values[this.recentmodule.value] = this.recentmodule);
    },

    /**
     * Marks one module as dependency of the other.
     *
     * @param {[type]} name [description]
     * @param {[type]} dependency [description]
     * returns {[type]} [description]
     */
    connect: function (name, dependency) {
        return this.get(name, true).needs(this.get(dependency, true));
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
    },

    getSerializedConnections: function (name, _out, _hash) {
        var module = this.get(name),
            out = _out || [],
            hash =  _hash || {},
            item,
            dependant;

        if (module && !module.serialising && module.defined()) {
            module.serialising = true;
            if (hash[module]) {
                out.splice(hash[module]-1, 1);
                hash[module] = out.push(module);
            }
            hash[module] = out.push(module);

            for (item in module.dependants) {
                dependant = module.dependants[item];
                if (!dependant.serialising) {
                    this.getSerializedConnections(dependant, out, hash);
                }
            }
        }

        return out;
    }
});

ModuleCollection.Module = function (name, value) {
    this.name = lib.stringLike(name);
    value && this.define(value);
    this.dependants = {};

    // Validate the name to not be blank.
    if (!this.name) {
        throw "Module name cannot be blank";
    }
};

// Functions to analyse the collection.
ModuleCollection.analysers = [function (stat) {
    stat.orphanModules = 0;
    stat.definedModules = 0;

    for (var prop in this.modules) {
        stat.orphanModules++; // assume orphan unless detected to be defined.
        if (this.modules[prop].defined()) {
            stat.definedModules++;
            stat.orphanModules--; // since defined, no longer orphan.
        }
    }
}];

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
        if (this.dependants[name]) {
            throw lib.format("Dependency \"{0}\" is already defined for {1}.", name, this.name);
        }

        this.dependants[name] = module;

        return this; // chain
    },

    toString: function () {
        return this.name;
    }
});

module.exports = ModuleCollection;