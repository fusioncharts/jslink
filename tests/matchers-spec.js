/**
 * @fileOverview
 * Contains all the global jasmine matchers that we require to run the specs.
 */

/* global beforeEach */
var matchers = {
    toBeOfType: function (typeName) {
        return ((typeof this.actual) == typeName);
    },

    toBeJSONEquals: function (refJSON) {
        return (JSON.stringify(this.actual) === JSON.stringify(refJSON));
    },

    toMatchSemVer: function () {
        /* jshint ignore:start */
        return !!(this.actual && this.actual.toString &&
            this.actual.toString().match(
                /^((\d+)\.(\d+)\.(\d+))(?:-([\dA-Za-z\-]+(?:\.[\dA-Za-z\-]+)*))?(?:\+([\dA-Za-z\-]+(?:\.[\dA-Za-z\-]+)*))?$/
            ));
        /* jshint ignore:end */
    }
};

beforeEach(function () {
    this.addMatchers(matchers);
});
