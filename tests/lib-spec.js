/**
 * @fileOverview
 * This file contains all test specs for the library functions of this tool.
 */

/* global describe, it, expect */
describe('library module', function () {
    var lib = require('../src/lib.js');

    describe('`lib.plural`', function () {
        it('must exist', function () {
            expect(lib.plural).toBeOfType('function');
        });

        it('plural must return exact word when count is between -1 or 1 (inclusive)', function () {
            expect(lib.plural(1, 'word')).toBe('1 word');
            expect(lib.plural(0, 'word')).toBe('0 word');
            expect(lib.plural(0.5, 'word')).toBe('0.5 word');
            expect(lib.plural(-0.5, 'word')).toBe('-0.5 word');
            expect(lib.plural(-1, 'word')).toBe('-1 word');
        });

        it('plural must return the word suffixed with "s" when count is not between -1 or 1', function () {
            expect(lib.plural(1e55, 'word')).toBe('1e+55 words');
            expect(lib.plural(11, 'word')).toBe('11 words');
            expect(lib.plural(1.1, 'word')).toBe('1.1 words');
            expect(lib.plural(-1.1, 'word')).toBe('-1.1 words');
            expect(lib.plural(-11, 'word')).toBe('-11 words');
        });

        it('must not fail on invalid parameters', function () {
            expect(lib.plural(10)).toBe('10 undefineds');
            expect(lib.plural()).toBe('undefined undefined');
            expect(lib.plural(NaN)).toBe('NaN undefined');
        });
    });

    describe('`lib.format`', function () {
        it('must exist', function () {
            expect(lib.format).toBeOfType('function');
        });

        it('must return the same variable in case of non string variable', function () {
            expect(lib.format([], [])).toEqual([]);
            expect(lib.format({}, [])).toEqual({});

            expect(lib.format(null, [])).toBe('');
            expect(lib.format(undefined, [])).toBe('');
        });

        it('must replace correctly in case of args array passed or if passed as arguments', function () {
            expect(lib.format('{0}Two{1}Four{2}', ['One', 'Three', 'Five'])).toBe(
                'OneTwoThreeFourFive');
            expect(lib.format('{0}Two{2}Four{1}', ['One', 'Three', 'Five'])).toBe(
                'OneTwoFiveFourThree');
            expect(lib.format('{0}Two{1}Four{2}', 'One', [], 'Five')).toBe('OneTwoFourFive');
            expect(lib.format('{0}Two{1}Four{1}', 'One', 'Three', 'Five')).toBe(
                'OneTwoThreeFourThree');
        });

        it('must replace null argument(s with empty string', function () {
            expect(lib.format('{0}{1}{2}', 'One', null, 'Two')).toBe('OneTwo');
            expect(lib.format('{0}{1}{2}', null, null, null)).toBe('');
        });

        it('must not convert fewer or falsy arguments(except null) to empty values', function () {
            expect(lib.format('{0}{1}{2}', 'One', undefined, 'Two')).toBe('OneundefinedTwo');
            expect(lib.format('{0}{1}{2}', undefined, {}, false)).toBe(
                'undefined[object Object]false');
            expect(lib.format('{0}{1}{2}', [undefined])).toBe('undefinedundefinedundefined');

        });

        it('must return the unformatted arguments in case of no args', function () {
            expect(lib.format('{0}{1}{2}', [])).toBe('{0}{1}{2}');
            expect(lib.format('{0}{1}{2}')).toBe('{0}{1}{2}');

            expect(lib.format([])).toEqual([]);
            expect(lib.format({})).toEqual({});

            expect(lib.format(null)).toBe('');
            expect(lib.format(undefined)).toBe('');
        });
    });

    describe('lib.fillStringArray()', function () {
        it('must be a function', function () {
            expect(lib.fillStringArray).toBeOfType('function');
        });
    });

    describe('`lib.stringLike`', function () {
        it('must exist', function () {
            expect(lib.stringLike).toBeOfType('function');
        });

        it('must allow non string objects as parameter that can be converted to string', function () {
            expect(lib.stringLike({})).toBe('[object Object]');
            expect(lib.stringLike(['a', 'b'])).toBe('a,b');
        });

        it('must not accept objects that cannot be converted to string', function () {
            expect(function () {
                lib.stringLike(NaN);
            }).toThrow(new TypeError('Not a valid string: NaN'));

            expect(function () {
                lib.stringLike(null);
            }).toThrow(new TypeError('Not a valid string: null'));

            expect(function () {
                lib.stringLike(undefined);
            }).toThrow(new TypeError('Not a valid string: undefined'));
        });

        it('must accept blank string', function () {
            expect(lib.stringLike('')).toBe('');
        });

        it('must trim the incoming string', function () {
            expect(lib.stringLike(' ')).toBe('');
            expect(lib.stringLike(' test')).toBe('test');
            expect(lib.stringLike('  test')).toBe('test');
            expect(lib.stringLike('test ')).toBe('test');
            expect(lib.stringLike('test  ')).toBe('test');
            expect(lib.stringLike(' test ')).toBe('test');
            expect(lib.stringLike('  test  ')).toBe('test');
        });
    });

    describe('`lib.copy`', function () {

        it('function must exist', function () {
            expect(lib.copy).toBeOfType('function');
        });

        it('must copy every property from source to sink', function () {
            var sink,
                source;

            sink = {
                a: 1,
                b: 3
            };

            source = {
                a: 5,
                b: {
                    a: 5
                }
            };

            lib.copy(sink, source);
            for (var key in source) {
                expect(sink[key]).toEqual(source[key]);
            }
        });
    });

    describe('`lib.argsArray2Object`', function () {
        it('function must exist', function () {
            expect(lib.copy).toBeOfType('function');
        });

        it('must convert an args array into an object', function () {
            expect(lib.argsArray2Object(['--test', '--abc'])).toEqual({
                test: true,
                abc: true
            });

            expect(lib.argsArray2Object(['--test=chart', '--abc'])).toEqual({
                test: 'chart',
                abc: true
            });

            expect(lib.argsArray2Object(['--test=chart', '--abc', '--test=charts'])).toEqual({
                test: ['chart', 'charts'],
                abc: true
            });

        });

        it('must use the default option name in case of not an option object', function () {
            expect(lib.argsArray2Object(['test'], 'opt')).toEqual({
                opt: 'test'
            });

            expect(lib.argsArray2Object(['test', 'abc'], 'opt')).toEqual({
                opt: ['test', 'abc']
            });
            //Empty object is expected in case of no optional arguments and default option
            expect(lib.argsArray2Object(['test', 'abc'])).toEqual({});
        });
    });

    describe('`lib.isUnixHiddenPath`', function () {
        it('function must be there in lib', function () {
            expect(lib.isUnixHiddenPath).toBeOfType('function');
        });

        /*
        @todo
        it('current folder and parent folder should be hidden paths', function() {
            expect(lib.isUnixHiddenPath('.')).toBe(true);
            expect(lib.isUnixHiddenPath('..')).toBe(true);
        });
        */

        it('must consider hidden files and folders as hidden paths', function () {
            expect(lib.isUnixHiddenPath('.abc/')).toBe(true);
            expect(lib.isUnixHiddenPath('.a.out')).toBe(true);
            expect(lib.isUnixHiddenPath('.a/b')).toBe(true);
            expect(lib.isUnixHiddenPath('.a/b/c.out')).toBe(true);
            expect(lib.isUnixHiddenPath('a/b/.out')).toBe(true);
            expect(lib.isUnixHiddenPath('a/b/.o.ut')).toBe(true);
        });

        it('must not consider the following paths as hidden paths', function () {
            expect(lib.isUnixHiddenPath('abc/')).toBe(false);
            expect(lib.isUnixHiddenPath('a.out')).toBe(false);
            expect(lib.isUnixHiddenPath('a/b')).toBe(false);
            expect(lib.isUnixHiddenPath('a/b/c.out')).toBe(false);
            expect(lib.isUnixHiddenPath('a/b/out')).toBe(false);
        });
    });

    describe('`lib.isUnixDirectory`', function () {
        it('function must be there in lib', function () {
            expect(lib.isUnixDirectory).toBeOfType('function');
        });

        it('must treat current folder and parent folder as directories', function () {
            expect(lib.isUnixDirectory('.')).toBe(true);
            expect(lib.isUnixDirectory('..')).toBe(true);
        });

        it('must treat following paths as directory paths', function () {
            expect(lib.isUnixDirectory('.abc/')).toBe(true);
            expect(lib.isUnixDirectory('.a/b/')).toBe(true);
            expect(lib.isUnixDirectory('a/b/')).toBe(true);
            expect(lib.isUnixDirectory('a/b.c/')).toBe(true);
        });

        it('must not treat the following paths as directory paths', function () {
            expect(lib.isUnixDirectory('.abc')).toBe(false);
            expect(lib.isUnixDirectory('.a/b')).toBe(false);
            expect(lib.isUnixDirectory('a/b')).toBe(false);
            expect(lib.isUnixDirectory('.a/b.out')).toBe(false);
            expect(lib.isUnixDirectory('a/b.c')).toBe(false);
        });
    });

    describe('`lib.parseJSONBooleans`', function () {
        it('function must be there in lib', function () {
            expect(lib.parseJSONBooleans).toBeOfType('function');
        });

        it('must convert object properties which have "false" string to boolean false', function () {

            expect(lib.parseJSONBooleans({
                b: '    false',
                c: 'false ',
                d: ' false'
            }, ['a', 'b', 'c', 'd'])).toEqual({
                b: false,
                c: false,
                d: false
            });

        });

        it('must convert property values which do not contain only "false" string to true', function () {
            expect(lib.parseJSONBooleans({
                a: 'true',
                b: 'random    false',
                c: 'random',
                d: 'abc true'
            }, ['a', 'b', 'c', 'd'])).toEqual({
                a: true,
                b: true,
                c: true,
                d: true
            });

            expect(lib.parseJSONBooleans({
                a: 'true',
                b: '    true',
                c: 'true ',
                d: ' true'
            }, ['a', 'b', 'c', 'd'])).toEqual({
                a: true,
                b: true,
                c: true,
                d: true
            });
        });

        it('must return the same variable in case it is not an object or properties are not passed',
            function () {
                expect(lib.parseJSONBooleans('a', ['a'])).toBe('a');
                expect(lib.parseJSONBooleans(5, ['a'])).toBe(5);
                expect(lib.parseJSONBooleans(true, ['a'])).toBe(true);
                expect(lib.parseJSONBooleans(false, ['a'])).toBe(false);
                expect(lib.parseJSONBooleans(undefined, ['a'])).toBe(undefined);

                expect(lib.parseJSONBooleans('a')).toBe('a');
                expect(lib.parseJSONBooleans(5, [])).toBe(5);
                expect(lib.parseJSONBooleans(true)).toBe(true);
                expect(lib.parseJSONBooleans(false)).toBe(false);
                expect(lib.parseJSONBooleans(undefined)).toBe(undefined);

                expect(lib.parseJSONBooleans({
                    a: 'true',
                    b: '    true',
                    c: 'true ',
                    d: ' true'
                })).toEqual({
                    a: 'true',
                    b: '    true',
                    c: 'true ',
                    d: ' true'
                });
            });
    });

    describe('`lib.cacher`', function () {
        it('function must be there in lib', function () {
            expect(lib.cacher).toBeOfType('function');
        });

        it('must return a cached value if the function was called with same arguments previously',
            function () {
                var sum,
                    cachedSum;

                sum = function (a, b) {

                    //callCount property is maintained to track how many times the function is being called
                    sum.callCount = ++sum.callCount || 1;

                    return a + b;
                };

                cachedSum = lib.cacher(sum, sum);

                expect(cachedSum(3, 4)).toBe(7);
                expect(sum.callCount).toBe(1);
                expect(cachedSum(3, 5)).toBe(8);
                expect(sum.callCount).toBe(2);
                expect(cachedSum(3, 4)).toBe(7);
                expect(sum.callCount).toBe(2);

            });

        it('must bust the cache after 1e3 unique function calls', function () {
            var sum,
                cachedSum;

            sum = function (a, b) {
                //callCount property is maintained to track how many times the function is being called
                sum.callCount = ++sum.callCount || 1;

                return a + b;
            };

            cachedSum = lib.cacher(sum, sum);
            cachedSum(3, 4);

            for (var i = 4, j = 5, k = 0; k < 1e3; i++, j++, k++) {
                cachedSum(i, j);
            }

            expect(cachedSum(3, 4)).toBe(7);
            expect(sum.callCount).toBe(1e3 + 2);

        });
    });


    describe('`lib.orderedKeys`', function () {
        it('must be a function', function () {
            expect(lib.orderedKeys).toBeOfType('function');
        });

        it('must throw an error when object is not passed for orderedKeys', function () {
            expect(function () {
                lib.orderedKeys('');
            }).toThrow(new Error('Cannot prepare ordered key for non-object variables.'));

            expect(function () {
                lib.orderedKeys(5);
            }).toThrow(new Error('Cannot prepare ordered key for non-object variables.'));

            expect(function () {
                lib.orderedKeys(true);
            }).toThrow(new Error('Cannot prepare ordered key for non-object variables.'));

            expect(function () {
                lib.orderedKeys(undefined);
            }).toThrow(new Error('Cannot prepare ordered key for non-object variables.'));

            /*todo verify this is a valid usecase or not
            expect(function () {
                lib.orderedKeys(null);
            }).toThrow(new Error('Cannot prepare ordered key for non-object variables.'));
            */
        });

        it('must not fail in case type is not a regular expression or not passed', function () {
            expect(lib.orderedKeys({
                a: 1
            }, ['a', 'b'])).toEqual(['a']);

            expect(lib.orderedKeys({
                a: 1
            }, ['a', 'b'], 'a')).toEqual(['a']);
        });

        it('must return the properties in the reference order', function () {
            expect(lib.orderedKeys({
                a: 1
            }, ['a', 'b'])).toEqual(['a']);

            expect(lib.orderedKeys({
                a: 1,
                b: false
            }, ['a', 'b'])).toEqual(['a', 'b']);

            expect(lib.orderedKeys({
                a: 1,
                b: false,
                c: function () {}
            }, ['a', 'c', 'b'])).toEqual(['a', 'c', 'b']);
        });

        it('must return those properties which are of the passed type', function () {
            expect(lib.orderedKeys({
                a: 1,
                b: false,
                c: function () {}
            }, ['a', 'c', 'b'], /^function$/)).toEqual(['c']);

            expect(lib.orderedKeys({
                a: 1,
                b: false,
                c: function () {}
            }, ['a', 'c', 'b'], /^function|boolean$/)).toEqual(['c', 'b']);
        });

    });

    describe('lib.isJSDocBlock', function () {

        it('must be a function', function () {
            expect(lib.isJSDocBlock).toBeOfType('function');
        });

        it('must return true when jsdoc-style block comment is passed', function () {
            expect(lib.isJSDocBlock({
                type: 'Block',
                value: '*'
            })).toBeTruthy();
        });

        it('must return false if @ignore directive is provided in jsdoc-style block', function () {
            expect(lib.isJSDocBlock({
                type: 'Block',
                value: '* @ignore'
            })).not.toBeTruthy();
        });

        it('must return true if @ignore directive is provided and `ignoreIgnore` flag is set to true',
            function () {
                expect(lib.isJSDocBlock({
                    type: 'Block',
                    value: '* @ignore'
                }, true)).toBeTruthy();
            });

        it('must not accept non-jsdoc style comment', function () {
            expect(lib.isJSDocBlock({
                type: 'Block',
                value: 'voila!'
            })).not.toBeTruthy();

            expect(lib.isJSDocBlock({
                type: 'Line',
                value: '* voila!'
            })).not.toBeTruthy();
        });

    });
});
