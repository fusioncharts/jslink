var matchers = {
    toBeOfType: function (typeName) {
        return ((typeof this.actual) == typeName);
    },

    toBeJSONEquals: function (refJSON) {
        return (JSON.stringify(this.actual) === JSON.stringify(refJSON));
    },

    toMatchSemVer: function () {
        return !!(this.actual && this.actual.toString &&
            this.actual.toString().match(/^((\d+)\.(\d+)\.(\d+))(?:-([\dA-Za-z\-]+(?:\.[\dA-Za-z\-]+)*))?(?:\+([\dA-Za-z\-]+(?:\.[\dA-Za-z\-]+)*))?$/));
    }
};

beforeEach(function() {
    this.addMatchers(matchers);
});