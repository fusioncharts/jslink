/**
 * This module defines the `Module` and the collection of modules as `ModuleCollection`. The classes allows easy
 * dependency calculation of modules.
 * @module collection
 *
 * @requires lib
 */
var SPC = " ",
    E = "",
    HASH = "#",

    lib = require("./lib.js"),
    fs = require("fs"),
    esprima = require("esprima"),

    esprimaOptions = {
        comment: true,
        loc: true,
        range: true // range mode is needed for easier buffer manipulation.
    },
    ModuleCollection, // constructor
    collectionTopoSort; // helper function

/**
 * This function recursively traverses through modules (vertices of a DAG) and pushes them to a stack in a neatly sorted
 * order based on its dependency trace.
 *
 * @private
 * @param {module:collection~ModuleCollection.Module} module
 * @param {Array<module:collection~ModuleCollection.Module>} matrix
 */
collectionTopoSort = function (module, _stack) {
    var item;

    if (module.topologicalMarker) {
        delete module.topologicalMarker;
        throw new Error(lib.format("Cyclic dependency error discovered while parsing {0}", module.name));
    }

    // Ensure that the _stack is present
    if (!_stack) {
        _stack = [];
        _stack.order = collectionTopoSort.uid++;
    }

    if (module._topostry !== _stack.order) {
        module.topologicalMarker = true;

        for (item in module.requires) {
            collectionTopoSort(module.requires[item], _stack); // recurse
        }

        delete module.topologicalMarker;
        module._topostry = _stack.order; // mark
        _stack.push(module); // Push into the right index
    }

    return _stack;
};

collectionTopoSort.uid = 1; // set counter for every new trace.

/**
 * Represents a collection of modules that have ability to depend on each other. The class maintains the dependency
 * link between modules and also the file source list that defines these modules. An equivalent representation of this
 * collection is Directed Acyclic Graph.
 * @class
 */
ModuleCollection = function () {
    /**
     * Stores all modules. In the context of digraph, this is the set of all vertices.
     * @type {Object<module:collection~ModuleCollection.Module>}
     */
    this.modules = {};

    /**
     * Keeps a track of the number of modules that exists in this collection.
     * @type {number}
     */
    this.numberOfModules = 0;

    /**
     * Stores the path of all source files with all modules defined within that source. Since one source can define more
     * than module, they are stored as array of modules per source. Usually, one does not need to access this directly
     * since the method {@link module:collection~ModuleCollection#getBySource} acts as getter.
     * @type {Object<Array>}
     */
    this.sources = {};

    /**
     * Stores all connections. In the context of digraph, this is the set of all directed edges.
     * @type {Array<module:collection~ModuleCollection.Dependency>}
     */
    this.dependencies = [];

    /**
     * Stores the references of all modules that mentions exports.
     * @type {Object<module:collection~ModuleCollection.Module>}
     */
    this.exports = {};

    /**
     * Keeps a track of the number of dependencies added to this collection.
     * @type {number}
     */
    this.numberOfDependencies = 0;
};

lib.copy(ModuleCollection.prototype, /** @lends module:collection~ModuleCollection.prototype */ {
    /**
     * Get a new module from collection and if it does not exist, create one.
     *
     * @param {string} name -
     * @param {boolean=} [anyway] -
     * @returns {module:collection~ModuleCollection.Module}
     */
    get: function (name, anyway) {
        return this.modules[(name = lib.stringLike(name))] || anyway &&
            (++this.numberOfModules, this.modules[name] = new ModuleCollection.Module(name));
    },

    /**
     * Gets nodes by it's source file name.
     *
     * @param {string} source
     * @returns {Object<module:collection~ModuleCollection.Source>}
     */
    getSource: function (source) {
        if (!this.sources[lib.stringLike(source)]) {
            throw new Error("Source not defined: " + source);
        }

        return this.sources[source];
    },

    /**
     * Gets nodes by it's source file name.
     *
     * @param {string} source
     * @returns {Object<module:collection~ModuleCollection.Module>}
     */
    getBySource: function (source) {
        return this.getSource(source).modules;
    },

    /**
     * Add a new module to the collection
     *
     * @param {string} name
     * @param {module:collection~ModuleCollection.Source} source
     * @returns {module:collection~ModuleCollection.Module}
     */
    addModule: function (name, source) {
        if (!(source = this.getSource(source))) {
            throw new Error("Source not predefined for module: " + name);
        }

        return this.get(name, true).define(source);
    },

    /**
     * Add a source file to the collection
     * @param {string} path
     * @param {module:collection~ModuleCollection.Module=} [module]
     * @return {module:collection~ModuleCollection.Source}
     */
    addSource: function (path, module) {
        return (module && this.get(module, true).define(new ModuleCollection.Source(path)).source) ||
            (this.sources[path] || (this.sources[path] = new ModuleCollection.Source(path)));

    },

    /**
     * Adds an export directive to the modules
     */
    addExport: function (module, path) {
        return (this.exports[(module = this.get(module).addExport(path))] = module);
    },

    /**
     * Marks one module as dependency of the other.
     *
     * @param {string} module -
     * @param {string} dependency -
     * @returns {module:collection~ModuleCollection.Dependency}
     */
    connect: function (module, dependency) {
        return (this.dependencies.push((this._recentDependency = new ModuleCollection.Dependency(this.get(module, true),
            this.get(dependency, true)))), ++this.numberOfDependencies, this._recentDependency);
    },

    /**
     * Analyse the collection and return statistics. This is performance intensive for very large collection, hence it
     * is suggested to be cached during re-use.
     * @returns {object}
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

    /**
     * Clones the collection.
     * @returns {module:collection~ModuleCollection}
     */
    clone: function () {
        var clone = new ModuleCollection(),
            item,
            i,
            ii;

        // Clone the sources
        for (item in this.modules) {
            clone.addModule(this.modules[item].clone(), this.modules[item].source);
        }

        // filter out and add the vertices that are defined at both ends.
        for (i = 0, ii = this.dependencies.length; i < ii; i++) {
            item = this.dependencies[i];
            clone.connect(item.module, item.require);
        }

        return clone;
    },

    /**
     * Serialises the modules using topological sorting mechanism and returns an array of arrays containing all modules
     * in the sorted order.
     * @returns {Array<Array>}
     */
    serialize: function () {
        var matrix = [], // array to hold all the sorted modules.
            modules,
            module;

        // Iterate over all modules, index them and run topological sort. Indexing can happen simultaneously as sorting
        // since they are happening on a single trace at a time
        modules = this.exports;
        for (module in modules) {
            matrix.push(collectionTopoSort(modules[module]));
        }

        return matrix;
    },


    toString: function () {
        var out = "digraph jslink {\n",
            module,
            dependant;

        // Iterate through all modules and map them along with their dependencies.
        for (module in this.modules) {
            module = this.modules[module];
            // In case there are no requirements, output the module as an isolated one.
            if (module.numberOfDependants) {
                for (dependant in module.dependants) {
                    out += lib.format("\"{0}\"->\"{1}\";\n", module, dependant);
                }
            }
            else {
                out += "\"" + module.name + "\";\n";
            }

        }
        return (out += "}");
    }
});

/**
 * This class represents the dependency relationship between two modules
 * ({@link module:collection~ModuleCollection.Module}.) The only two restrictions being that a module cannot be marked
 * to depend on itself (to prevent loops in the dependency tree,) and that same dependency cannot be duplicated.
 *
 * @class
 * @param {module:collection~ModuleCollection.Module} module
 * @param {module:collection~ModuleCollection.Module} requirement
 *
 * @example
 * // We will create two modules and then mark a relationship between them. The two modules are `product` and `customer`
 * // with the definition of `product` is annotated with "@requires customer".
 * var prod = new ModuleCollection.Module("product"),
 *     cust = new ModuleCollection.Module("customer"),
 *     needs;
 *
 * // mark that `product` module requires `customer`
 * needs = new ModuleCollection.Dependency(prod, cust);
 *
 * // Check whether the dependency was marked successfully.
 * console.log(needs); // outputs "product" -> "customer"
 * console.log(!!prod.requires["customer"]) // outputs "true"
 */
ModuleCollection.Dependency = function (module, requirement) {
    // Connect the modules internally. Most validations will happen there itself.
    module.require(requirement);

    /**
     * This property specifies the end-point of the dependency. In other words, it specifies the module that
     * {@link module:collection~ModuleCollection.Dependency#module} requires.
     * @type {module:collection~ModuleCollection.Dependency}
     * @readOnly
     */
    this.require = requirement;

    /**
     * This property specifies the module that declares its requirement.
     * @type {module:collection~ModuleCollection.Dependency}
     * @readOnly
     */
    this.module = module;
};

lib.copy(ModuleCollection.Dependency.prototype, /** @lends module:collection~ModuleCollection.Dependency.prototype */ {
    toString: function () {
        return lib.format("\"{0}\"->\"{1}\";", this.module.toString().replace(/\"/g, "\\\""),
            this.require.toString().replace(/\"/g, "\\\""));
    }
});

/**
 * This class represents one module whether defined by a source file or specified as a requirement of a module being
 * defined. Module objects by default do not maintain dependencies, but stores them as references.
 *
 * @class
 * @param {string} name
 * @param {string=} [source]
 *
 * @example
 * // Create a new module and also mark that the module is defined by providing the file path of this module.
 * var module = new ModuleCollection.Module("main.process", "develop/main.js");
 *
 * // Create a new module, but keep it undefined without providing the source file path.
 * var module = new ModuleCollection.Module("main.output");
 */
ModuleCollection.Module = function (name, source) {
    /**
     * The name or identifier string of the module. In all contexts this is the value that is to be used to refer to the
     * module in case a direct reference to the instance variable is not possible.
     * @type {string}
     * @readOnly
     */
    this.name = lib.stringLike(name);

    // Validate the name to not be blank.
    if (!this.name) {
        throw new TypeError("Module name cannot be blank.");
    }
    /**
     * Stores all modules that this module needs/requires. (Verices that head this.)
     * @type {Object<module:collection~ModuleCollection.Dependency>}
     */
    this.requires = {};
    /**
     * Number of modules that this module depends on. ("Egress Valency" in context of directed graph.)
     * @type {number}
     */
    this.numberOfRequirements = 0;
    /**
     * Stores all modules that require this module. (Verices that tail this.)
     * @type {Object<module:collection~ModuleCollection.Dependency>}
     */
    this.dependants = {};
    /**
     * Number of modules that says that it depends on this module. ("Inress Valency" in context of directed graph.)
     * @type {number}
     */
    this.numberOfDependants = 0;

    /**
     * Export directives
     * @property {Object<Array>} [targets]
     */
    this.exports = [];

    /**
     * The source file path that defines this module. This is to be used as a getter and should be set using the
     * {@link module:collection~ModuleCollection.Module#define} method.
     * @type {module:collection~ModuleCollection.Source}
     * @readOnly
     */
    this.source = undefined;

    // Define the node if passed as part of constructor.
    source && this.define(source);
};

lib.copy(ModuleCollection.Module.prototype, /** @lends module:collection~ModuleCollection.Module.prototype */ {
    /**
     * Modules can be created and yet be not marked as defined. Definition takes place only when a value is passed to
     * it - usually the source path.
     *
     * @chainable
     * @returns {module:collection~ModuleCollection.Module}
     */
    define: function (source) {
        // Redefinition is not allowed.
        if (this.defined()) {
            throw lib.format("Duplicate definition of {0} at: {1}\n\nAlready defined by {2}", this.name, source,
                this.source);
        }
        if (!(source instanceof ModuleCollection.Source)) {
            throw "Definition accepts instance of ModuleCollection.Source only.";
        }
        this.source = source; // store
        return this; // chain
    },

    /**
     * Add the list of target modules marked for export.
     * @param {string} meta
     */
    addExport: function (meta) {
        // If export meta is not defined then we treat the module name as meta.
        if (!meta) {
            meta = this.name;
        }
        // We add the meta information unless there is a duplicate. At least the same module should not have two same
        // export meta!
        if ((this.exports || (this.exports = [])).indexOf(meta) === -1) {
            this.exports.push(meta);
        }

        return this;
    },

    /**
     * Check whether the module has been defined formally. Modules can be created and yet be not marked as defined.
     *
     * @returns {boolean}
     */
    defined: function () {
        return (this.source instanceof ModuleCollection.Source);
    },

    /**
     * Marks that this module requires another module (as passed via parameter.)
     *
     * @param {module:collection~ModuleCollection.Module} requirement
     * @chainable
     * @returns {module:collection~ModuleCollection.Module}
     */
    require: function (requirement) {
        // Module cannot depend on itself and it cannot add a dependency already added.
        if (this.name === requirement.name) {
            throw new Error(lib.format("Module {0} cannot depend on itself!", this));
        }

        if (this.requires[requirement] || requirement.dependants[this]) {
            throw new Error(lib.format("{1} already marked as requirement of {0}", this.name, requirement.name));
        }

        // Store the dependency within both the connected modules.
        this.requires[requirement] = requirement;
        this.numberOfRequirements++;
        requirement.dependants[this] = this;
        requirement.numberOfDependants++;

        return this;
    },

    /**
     * Clone this module.
     * @returns {module:collection~ModuleCollection.Module}
     */
    clone: function () {
        return new ModuleCollection.Module(this.name, this.source);
    },

    toString: function () {
        return this.name;
    }
});

/**
 * The class allows parsing of Mozilla compatible AST from a source file and then perform operations on the tree as a
 * part of process, verification or for output.
 *
 * @constructor
 * @param {string} path
 */
ModuleCollection.Source = function (path) {
    /**
     * Stores the path of the source
     * @type {string}
     */
    this.path = path;

    // Since parsing might have error, but that needs to be trapped to return error report. Thus, we wrap it
    // inside a try block.
    try {
        /**
         * Raw data of the source file.
         *
         * @type {string}
         */
        this.raw = fs.readFileSync(path);
    }
    catch (err) {
        throw new Error(lib.format("{1}\n> {0}", path, err.message));
    }

    /**
     * The ESPrima parsed source tree for this source.
     * @type {object}
     */
    this.ast = {
        comments: [],
        stub: true
    };
};

/**
 * @constructor
 * @param {string} definition
 * @param {function} evaluator
 */
ModuleCollection.Source.Directive = function (definition, evaluator) {
    /**
     * @type {string}
     */
    this.definition = definition;
    /**
     * @type {function}
     */
    this.evaluator = evaluator;
    /**
     * @type {string}
     */
    this.name = definition.split(SPC)[0];
    /**
     * @type {RegExp}
     */
    this.pattern = lib.getDirectivePattern(this.name);
};

/**
 * @constructor
 * @param {string} definition
 * @param {function} evaluator
 */
ModuleCollection.Source.Processor = function (definition, evaluator) {
    /**
     * @type {string}
     */
    this.name = definition;
    /**
     * @type {function}
     */
    this.evaluator = evaluator;
    /**
     * @type {string}
     */
    this.name = definition.split(SPC)[0];
};

/**
 * @todo  Change all addX functions to single add("x", ...) API.
 */
lib.copy(ModuleCollection.Source, /** @lends module:collection~ModuleCollection.Source */ {
    /**
     * @type {Array<module:collection~ModuleCollection.Source.Directive>}
     */
    directives: [],

    /**
     * @type {Object<module:collection~ModuleCollection.Source.Processor}
     */
    processors: {},

    /**
     * @todo jsdoc
     */
    macros: {},

    /**
     * @param {string} definition
     * @param {function} evaluator
     */
    addDirective: function (definition, evaluator) {
        if (typeof evaluator !== "function") {
            throw new Error("Directive evaluator cannot be not a function!");
        }
        this.directives.push(new this.Directive(definition, evaluator));
    },

    /**
     * @param {object<Source.Directive>} directives
     */
    addDirectives: function (directives) {
        for (var definition in directives) {
            this.addDirective(definition, directives[definition]);
        }
    },

    /**
     * @param {string} definition
     * @param {function} evaluator
     */
    addProcessor: function (definition, evaluator) {
        if (typeof evaluator !== "function") {
            throw new Error("Processor evaluator cannot be not a function!");
        }

        if (this.processors[definition]) {
            throw new Error("Duplicate processor.");
        }

        this.processors[definition] = (new this.Processor(definition, evaluator));
    },

    /**
     * @param {object<Source.Directive>} processors
     */
    addProcessors: function (processors) {
        for (var definition in processors) {
            this.addProcessor(definition, processors[definition]);
        }
    },

    /**
     * @param {string} definition
     * @param {function} evaluator
     */
    addMacro: function (definition, evaluator) {
        if (typeof evaluator !== "function") {
            throw new Error("Macro processor evaluator cannot be not a function!");
        }

        if (this.macros[definition]) {
            throw new Error("Duplicate macro processor.");
        }

        this.macros[definition] = evaluator;
    },

    /**
     * @todo jsdoc
     */
    addMacros: function (processors) {
        for (var definition in processors) {
            this.addMacro(definition, processors[definition]);
        }
    }
});

lib.copy(ModuleCollection.Source.prototype, /** @lends module:collection~ModuleCollection.Source.prototype */ {
    toString: function () {
        return this.path;
    },

    /**
     * @returns {object}
     */
    tree: function () {
        return this.ast.stub && (this.ast = esprima.parse(this.raw.toString(), esprimaOptions)) || this.ast;
    },

    /**
     * @returns {Array<string>}
     */
    content: function () {
        return this.contentBuffer || (this.contentBuffer = this.raw.toString().split(E));
    },

    /**
     * @param {Object=} scope
     */
    parse: function (ns) {
        var source = this;

        this.tree().comments.forEach(function (comment) {
            var returns = [ns || {}, {}]; // We store it as array of objects to concat with arguments

            // Only continue if its a block comment and starts with jsdoc syntax. Also prevet blocks having @ignore
            // tags from being parsed.
            // Pass the directives in given order
            lib.isJSDocBlock(comment) && ModuleCollection.Source.directives.forEach(function (directive) {
                // Call the directive replacer function and then pass the evaluator via a router
                comment.value.replace(directive.pattern, (function () {
                    return function ($glob, $1) {
                        // Execute the evaluator in the source scope and send it a very specific argument set
                        // 1: namespace, 2+: all the specific matches of the name pattern
                        ($1 && ($1 = $1.trim())) && (returns[1][directive.name] = directive.evaluator.apply(source,
                                returns.concat(Array.prototype.slice.call(arguments, 1, -2))));
                    };
                }())); // end comment replacer callback
            }); // end order forEach
        }); // end comment forEach
    },

    macro: function (definitions) {
        var scope = {
                source: this
            };

        // Iterate on each block
        this.tree().comments.forEach(function (comment) {
            var macro;

            if (!lib.isJSDocBlock(comment, true, HASH)) {
                return;
            }

            if ((macro = comment.value.match(/\#([^\s\n\r]+)([\w\W]*)/))) {
                macro.name = macro[1].trim();
                macro.args = (macro[2] || E).trim();

                // Raise error if an unknown macro is found in source code
                if (!ModuleCollection.Source.macros[macro.name]) {
                    throw new Error(lib.format("Unknown macro \"{0}\".\n    at {1}:{2}:{3}", macro.name,
                        scope.source.path, comment.loc.start.line, comment.loc.start.column));
                }

                scope.comment = comment;
                scope.definition = definitions[macro.name];

                ModuleCollection.Source.macros[macro.name].call(scope, macro.args);
            }


        });
    },

    /**
     * @param {Object} invokedProcessors
     */
    process: function (invokedProcessors) {
        // Do not process if no processor has been invoked
        if (!(typeof invokedProcessors === "object" && Object.keys(invokedProcessors).length)) {
            return;
        }

        var processor,
            scope = {
                content: this.content()
            },

            runprocessor = function (comment) { // defined outside to save redefinition in loop.
                // Only continue if its a block comment and starts with jsdoc syntax. Also prevet blocks having @ignore
                // tags from being parsed.
                if (!lib.isJSDocBlock(comment)) {
                    return;
                }
                scope.comment = comment;
                this.evaluator.apply(this, this.options);
            };

        for (processor in invokedProcessors) {
            scope.evaluator = ModuleCollection.Source.processors[processor].evaluator;
            scope.options = invokedProcessors[processor];
            this.tree().comments.forEach(runprocessor, scope);
        }
    }
});

ModuleCollection.analysers = [];

// Functions to analyse the collection.
ModuleCollection.analysers.push(function (stat) {
    var module,
        prop;

    stat.orphanModules = [];
    stat.definedModules = [];
    stat.numberOfExports = 0;

    for (prop in this.modules) {
        module = this.modules[prop];
        stat[module.defined() ? "definedModules" : "orphanModules"].push(module);
        stat.numberOfExports += module.exports.length || 0;
    }
});

module.exports = ModuleCollection;
