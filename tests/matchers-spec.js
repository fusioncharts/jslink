var matchers = {
    toBeOfType: function (typeName) {
        return ((typeof this.actual) == typeName);
    },

    toBeJSONEquals: function (refJSON) {
        return (JSON.stringify(this.actual) === JSON.stringify(refJSON));
    }
};

beforeEach(function() {
    this.addMatchers(matchers);
});