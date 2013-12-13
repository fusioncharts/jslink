jslink (development prototype)
================================

C preprocessor like preprocessor for JavaScript. This is currently under development stage, ready to be tested.

Why jslink?
-------------
Allows one to define dependencies in ways similar to `C`/`C++` `#include` and `#define` in a syntax compatible with
Closure Compiler and jsDocs.

How to use jslink?
--------------------

Define all modules using `@module` and what the module needs as `@require` within `/**  */` style comment block. To
export a particular file with all its dependencies and dependants, add `@export filename.js` to the same comment block.
Now, run jsLink on terminal and provide the location to the source directory. jslink will calculate all dependencies
and if no error is found, it will output it in a destination folder.

Samples use case
----------------
Refer to `tests/structures` directory for a set of dummy project dependency structures.


Commandline Options
-------------------
- `--recursive`
- `--overwrite`
- `--exportmap` or `--exportmap=filename.dot`
- `--source=pathtofileordirectory` (repeatable)
- `--includePattern=RegularExpression`
- `--excludePattern=ReqularExpression`
- `--version`
- `--conf=filename.conf`
- `--test`
- `--verbose`
- `--help`


See development in action
-------------------------
Clone this repository and navigate to the repository root. Execute the following command to pre-process the jslink
source file itself!

```
./src/jslink --source=tests/structure/bilinear/ --destination=./out/bilinear/ --recursive --exportmap --overwrite
```

The above command will output the following if all goes well and on further inspecting the `./out/bilinear/` directory
one can see two concatendated files - `main.js` and `main.helper.js`.

```
11 files, 11 modules processed for 2 export directives.
```

Technical Notes
- Whenever any option asks you to provide a directory, if you are not providing `.` or `..`, ensure that you end the
  path with a `/`