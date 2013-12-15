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

    1. Define Module
    2. Define Dependencies
    3. Specify Exports
    4. Running `jslink` command

### Defining a module

Right at the beginning (or anywhere else) of your JavaScript source file, declare your module name within a comment
block using the `@module ModuleName` syntax (similar to closure and jsDoc).

```
/**
 * This is a module that is intended to be the main module of this project.
 * @module Main
 */
```

Similarly, there can be another file

```
/**
 * This is a helper module containing a set of functions that are repeatedly used.
 * @module Helper
 */
```

### Specifying dependencies

In the example where we defined two modules, it is evident that the `Main` module depends on `Helper` module and as such
expects the file containing `Helper` module to be concatenated before itself. We can accomplish this by using the
`@requires ModuleName` tag. As such, we modify the module definition of `Main` by adding this new tag.

```
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

```
/**
 * This is a module that is intended to be the main module of this project.
 * @module Main
 * @requires Helper
 * @export main.js
 */
```

### Running jslink command

Once you have all your module definitions, dependencies and exports specified, you may run the following command and it
will output the concatenated files by default within the `out` directory in your current working directory.

```
jslink source-js-directory/
```


## Installing jslink

```
npm install jslink
```

## Samples use case
Refer to `tests/structures` directory within this repository for a set of dummy project dependency structures. The
sources of this project also has the modules and dependency defined. After cloning the repository to a folder, you can
even execute the following command to see `jslink` in action.

```
./src/jslink tests/structure/bilinear --destination=out/bilinear/ --overwrite
```

## List of Commandline Options

- `--help`
  Outputs the commandline help text to terminal.

- `--version`
  Shows the jslink version being used.

- `--conf`

- `--source`
- `--destination`
- `--includePattern`
- `--excludePattern`

- `--recursive`
- `--overwrite`
- `--exportmap`


- `--test`
- `--verbose`

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