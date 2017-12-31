//this file is a template for converting jscad to a Node module
const scadApi = require('@jscad/scad-api')
const { difference, intersection, union } = scadApi.booleanOps;
const { CAG, CSG } = scadApi.csg;
const { echo } = scadApi.debug;
const { linear_extrude, rectangular_extrude, rotate_extrude } = scadApi.extrusions;
const { abs, acos, asin, atan, atan2, ceil, cos, floor, log, lookup, max, min, pow, rands, round, sign, sin, sqrt, tan } = scadApi.maths;
const { OpenJsCad } = scadApi.OpenJsCad;
const { circle, polygon, square, triangle } = scadApi.primitives2d;
const { cube, cylinder, geodesicSphere, polyhedron, sphere, torus } = scadApi.primitives3d;
const { center, chain_hull, contract, expand, hull, minkowski, mirror, multmatrix } = scadApi.transformations;
const { vector_char, vector_text } = scadApi.text;

//CONTENT

module.exports = main;

if (typeof getParameterDefinitions === 'function') {
    module.exports.getParameterDefinitions = getParameterDefinitions;
}
