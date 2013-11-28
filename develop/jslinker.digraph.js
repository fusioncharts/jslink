/**
 * @module jslinker.digraph
 * @requires jslinker.lib
 */

var Graph = function () {
    this.vertices = {};
    this.edges = [];
    this.length = 0;
};

Graph.Vertex = function (name, value) {
    this.name = name;
    this.edges = [];
    this.value = value;
};

Graph.Vertex.prototype.degree = function () {
    return this.edges.length;
};

Graph.Edge = function (tail, head) {
    this.tail = tail;
    this.head = head;
    tail.edges.push(this);
    head.edges.push(this);
};

Graph.prototype.addVertex = function (name, value) {
    if (!this.vertices[name]) {
        this.vertices[name] = new Graph.Vertex(name, value);
        this.length++;

    }
    else if (value) {
        this.vertices[name].value = value;
    }
    return this.vertices[name];
};

Graph.prototype.addEdge = function (tail, head) {
    return new Graph.Edge(this.addVertex(tail), this.addVertex(head));
};

module.exports = Graph;