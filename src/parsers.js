/**
 * @module  parsers
 * @requires  lib
 */

var DOT = ".",
    pathUtil = require("path"),
    fs = require("fs"),
    lib = require("./lib.js");

module.exports = {
    /**
     * List of directives that would be parsed.
     */
    directives: {
        // This function is passed to the replacer function to excavate the module name from the module
        // definition line and then add it to the collection.
        "module": function (collection, args, name) {
            return collection.addModule(name, this);
        },

        // Adds dependency relations.
        "requires": function (collection, args, dependency) {
            var extern;

            // If module was not parsed, no need to proceed.
            if (!args.module) {
                return;
            }

            // While adding dependency, check whether it is a third-party external file
            if (/^\.?\.\/.*[^\/]$/.test(dependency)) {
                // We build the relative path to the dependant module and check if file exists.
                // Module is anyway defined here!
                dependency = pathUtil.join(pathUtil.dirname(args.module.source), dependency);

                // If the file does not exist, we raise an error.
                if (!fs.existsSync(dependency)) {
                    throw new Error (lib.format("External module file not found: \"{0}\"", dependency));
                }

                // Now that we have an absolute module file name, we check whether it is already defined. If
                // not, we do so.
                (!(extern = collection.get(pathUtil.relative(DOT, dependency), true)).defined()) &&
                    collection.addSource(dependency, extern);

                // Set the module name to the relative value so as not to output full path in report.
                dependency = pathUtil.relative(DOT, dependency);
            }
            // Connect the modules in collection
            collection.connect(args.module, dependency);
        },

        // This function searches whether the module definition has any export directive. This is defined here
        // to avoid repeated definition within loop.
        "export": function (collection, args, exportPath) {
            args.module && args.module.addExport(exportPath);
        }
    }
};
