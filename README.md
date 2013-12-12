jslinker (development prototype)
================================

C preprocessor like preprocessor for JavaScript. This is currently under development stage with proof-of-concept
codebase.

Why jslinker?
-------------
Allows one to define dependencies in ways similar to `C`/`C++` `#include` and `#define` in a syntax compatible with
Closure Compiler and jsDocs.

Commandline Options
-------------------
- `--recursive`
- `--overwrite`
- `--exportmap` or `--exportmap=filename.dot`
- `--source=pathtofileordirectory`
- `--includePattern=RegularExpression`
- `--excludePattern=ReqularExpression`
- `--version`
- `--conf=filename`


See development in action
-------------------------
Clone this repository and navigate to the repository root. Execute the following command to pre-process the jslinker
source file itself!

```
node ./develop/core.js --exportmap --overwrite --source=tests/structure/bilinear/ --recursive
```

The above command will output the following indicating that two files will be outputted with their contents in the order
specfied.

```
...
Sorted Output:
[
    [
        "cleanup",
        "compare",
        "make_string",
        "printf",
        "execute",
        "init",
        "parse",
        "main"
    ],
    [
        "sys_probe",
        "sys_flag",
        "helper"
    ]
]
11 files, 11 modules processed.
```

Technical Notes
- Whenever any option asks you to provide a directory, if you are not providing `.` or `..`, ensure that you end the
  path with a `/`