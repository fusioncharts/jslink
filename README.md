# jslink


Automated module cocatenation with dependency management - much like the C preprocessor. This commandline tool allows
developers to concatenate their JavaScript (or other) source files with `@module` and `@requires` declarations. This
utility removes the tight coupling of project build scripts and source files - as such allowing developers and teams to
have the flexibility of changing the inclusion order and dependencies of source files without having to modify a build
script.

## Why jslink?

Most JavaScript (and similar) projects that have a build system rely on a task of concatenating source files in a
specific order before being used for minification or other build tasks. As such, the build script (or a separate
resource file used by the build script) contains a list of files in a specific order to facilitate concatenation. The
main issue with this approach is that it means duplication of information and tight coupling of module definitions with
the build script. Why is this bad? Simply because a change in the dependency tree of the modules results in a manual
effort to update the build script (or the resource file) and with it - possibility of build failure.

Presently Google's Closure Compiler does provide module dependency management, but that is when you use Closure at its
best! What if you are not using Closure or what if you are using the simple aspects of Closure? There are other
alternatives such as CommonJS, Require, AMD and other NodeJS based tools, but all of them assume cross compilability of
your source files on browser/host and on the build platform. What if your project is meant to run only on a browser and
that you do not need to depend on any such runtime dependency management systems?

Since `jslink` annotations are within JavaScript `/* */` comment blocks, it does not affect the source code and neither
does it need any runtime dependency.

## How to use jslink?

1. Define modules using `@module`
2. Define dependencies using `@require`
3. Specify exports using `@export`
4. Run the `jslink` command

### Defining a module

Right at the beginning (or anywhere else) of your JavaScript source file, declare your module name within a comment
block using the `@module ModuleName` syntax (similar to closure and jsDoc).

```javascript
/**
 * This is a module that is intended to be the main module of this project.
 * @module Main
 */
```

Similarly, there can be another file

```javascript
/**
 * This is a helper module containing a set of functions that are repeatedly used.
 * @module Helper
 */
```

### Specifying dependencies

In the example where we defined two modules, it is evident that the `Main` module depends on `Helper` module and as such
expects the file containing `Helper` module to be concatenated before itself. We can accomplish this by using the
`@requires ModuleName` tag. As such, we modify the module definition of `Main` by adding this new tag.

```javascript
/**
 * This is a module that is intended to be the main module of this project.
 * @module Main
 * @requires Helper
 */
```

### Specifying which module needs to be exported as a file

Now that we have a set of module and their dependencies defined, we still have one thing left - mention what files we
want to be created by `jslink`. Though `jslink` can automatically determine multiple distinct set of concated files to
be created, yet we would prefer to specify them within our module files so that we have a better control on what files
we want as output. This we do using the `@export FileName` tag. In a dependency tree, one can specify the export tag on
any module within the hierarchy and all files that it depends on and other modules that depends on it will also be
exported.

```javascript
/**
 * This is a module that is intended to be the main module of this project.
 * @module Main
 * @requires Helper
 * @export main.js
 */
```

### Running the jslink command on source directory

Once you have all your module definitions, dependencies and exports specified, you may run the following command and it
will output the concatenated files by default within the `out` directory in your current working directory.

```bash
jslink source-js-directory/
```

## Installing jslink
The easiest way to install jslink is from the NPM registry.

```bash
npm install jslink
```

jslink can either be installed from NPM repository or this git repository can be cloned. If the repository is cloned,
there are a few dependencies that needs to be procured. You may easily install them using `npm install -d`.


## Usage examples
Refer to `tests/structures` directory within this repository for a set of dummy project dependency structures. The
sources of this project also has the modules and dependency defined. After cloning the repository to a folder, you can
even execute the following command to see `jslink` in action.

```bash
./src/jslink tests/structure/bilinear --destination=out/bilinear/ --overwrite
```

## List of Commandline Options

By default, any command-line parameter sent to jslink that is not prefixed using double-hyphen (i.e. `--`,) jslink
treats that as a parameter specifyin which directory to read the source files from. Other than this, there are a number
of commandline parameters that can be used to configure jslink.

|Parameter          |Summary
-------------------:|:--------------------------------------------------------------------------------------------------
`--destination`     |The output directory where all processed files will be saved
`--includePattern`  |White-list of input files names from source directory in regular-expression format
`--excludePattern`  |Black-list of input files names from source directory in regular-expression format
`--recursive`       |Look into all sub-directories while reading source directory
`--source`          |The source directory to read from
`--conf`            |jslink configuration JSON file location
`--test`            |Run jslink in test mode without writing to file-system
`--verbose`         |Will output useful (hopefully) information during the linking process
`--help`            |Outputs the usage help text to terminal
`--version`         |Shows the jslink version being used

### `--destination=<output-directory>`
By default, jslink outputs the files in `out/` folder of the current working directory. This can be changed using this
parameter. Specifying `jslink source-js-directory/ --destination=concat/source/` will cause jslink to store all output
files to `concat/source/` folder relative to the current working directory.

### `--includePattern=<regular-expression>`
Using this parameter one can specify the file name pattern that has to be applied before processing a file from the
source folder. Use this to white-list files within a source location that contains other files that does not require
to be processed.

The default value of this parameter is `.+\\.js$`, which species that accept only files whose name ends with `.js`.
*While specifying your [regular-expression], ensure to escape the `\`
character.*

### `--excludePattern=<regular-expression>`
Useful in black-listing files from the source folder. Use this to specify the file names that are to be ignored while
reading the source directory. The default value is `/^$/` - implying that nothing is blacklisted.

### `--recursive`
In case the source files are within sub-directories, specifying this option will make jslink go through all directories
and their children (and so on) within the source directory. By default recursive is not set.

One can also specify this as `--recursive=true` or `--recursive=false` - very useful while overriding any cinfiguration
provided using the `--conf` parameter.

### `--overwrite`
Specifies whether jslink will overwrite files in case it encounters that they already exist on file-system. By default,
overwriting is not allowed, use `--overwrite` or `--overwrite=true` to set otherwise.

### `--source=<source-directory>`
This parameter is helpful in specifying the source folders from where jslink would read module definitions. This is
usually your application's or library's development directory. Location can be specified as `--source=develop/src/`.
More than one source directories can be specified - `jslink --source=src/app1/ --source=src/app2/`.

Note that in case any parameter does not have `--` specified, it is treated as `--source`. For example, providing
`jslink --source=src/app1/ --source=src/app2/` is equal to `jslink src/app1/ src/app2/`.

### `--conf=<configuration-file-location>`
jslink allows you to store its commandline parameters within a configuration file in `JSON` format. This allows you to
store specific configurations for repeated use. The jslink configuration file accepts all the command-line parameters
with the same name.

Sample `jslink.conf` file would look like the following block and can be used as `jslink --conf=jslink.conf`.

```json
{
    "options": {
        "source": ["src/app1/", "src/app2/"],
        "recursive": "true",
        "overwrite": "true",
        "destination": "concat/source/"
    }
}
```

### `--test`
Runs jslink in test mode. In this mode, none of the conatenated files will be written to file-system. Instead, the
entire process will be simulated to check for cyclic dependency and other such errors.


## Road Ahead

- Solution on Windows platform.
- Ability to provide a reference set of restrictions in `strict` mode so that build integrity can be enforced.
- Simple text replacement within comment blocks.
- Simple text replacement macros.
- Ability to output all module graphs without @exports (already implemented, pending proper API decision)
- Direct image output of graphViz dot files.

## Technical Notes
- Whenever any option asks you to provide a directory, if you are not providing `.` or `..`, ensure that you end the
  path with a `/`.
- If there is a cyclic dependency found in the definitions (such as A requires B requires A), this utility will stop
  with an error.
- Presently, jslink cannot output distinct dependency tree with export directives having modules required by disparate
  group of modules.
- Add more chatter to verbose output.
- Have a silent mode

[regular-expression]: http://en.wikipedia.org/wiki/Regular_expression