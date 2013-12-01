jslinker (development prototype)
================================

C preprocessor like preprocessor for JavaScript. This is currently under development stage with proof-of-concept codebase.

Why jslinker?
-------------
Allows one to define dependencies in ways similar to `C`/`C++` `#include` and `#define` in a syntax compatible with Closure Compiler and jsDocs.

See development in action
-------------------------
Clone this repository and navigate to the repository root. Execute the following command to pre-process the jslinker source file itself!

```
node ./develop/jslinker.main.js --source=./develop/ --output=jslinker.main:./jslinker.js --overwrite
```