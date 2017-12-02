require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts" />
var makerjs = require('makerjs');
var RimboxCorner = (function () {
    function RimboxCorner(holeRadius, rimThickness) {
        var rim = Math.min(rimThickness, holeRadius);
        var hr = holeRadius + rim;
        this.paths = {
            centerRound: new makerjs.paths.Arc([0, 0], hr, 0, 90),
            hFillet: new makerjs.paths.Arc([0, hr + holeRadius], holeRadius, 180, 270),
            wFillet: new makerjs.paths.Arc([hr + holeRadius, 0], holeRadius, 180, 270)
        };
    }
    return RimboxCorner;
})();
var RimboxInner = (function () {
    function RimboxInner(width, height, holeRadius, rimThickness) {
        var mm = makerjs.model;
        var corner = new RimboxCorner(holeRadius, rimThickness);
        this.models = {
            bottomLeft: corner,
            bottomRight: mm.move(mm.mirror(corner, true, false), [width, 0]),
            topLeft: mm.move(mm.mirror(corner, false, true), [0, height]),
            topRight: mm.move(mm.mirror(corner, true, true), [width, height])
        };
        var line = makerjs.paths.Line;
        var rim = Math.min(rimThickness, holeRadius);
        var d = 2 * holeRadius + rim;
        this.paths = {
            bottom: new line([d, -holeRadius], [width - d, -holeRadius]),
            top: new line([d, height + holeRadius], [width - d, height + holeRadius]),
            left: new line([-holeRadius, d], [-holeRadius, height - d]),
            right: new line([width + holeRadius, d], [width + holeRadius, height - d])
        };
    }
    return RimboxInner;
})();
var Rimbox = (function () {
    function Rimbox(width, height, holeRadius, rimThickness, solid) {
        if (arguments.length == 0) {
            var defaultValues = makerjs.kit.getParameterValues(Rimbox);
            width = defaultValues.shift();
            height = defaultValues.shift();
            holeRadius = defaultValues.shift();
            rimThickness = defaultValues.shift();
        }
        var mm = makerjs.models;
        var cornerRadius = holeRadius + rimThickness;
        var c2 = cornerRadius * 2;
        this.models = {
            bolts: new mm.BoltRectangle(width, height, holeRadius),
            outer: new mm.RoundRectangle(width + c2, height + c2, cornerRadius)
        };
        if (!solid) {
            this.models['inner'] = new RimboxInner(width, height, holeRadius, rimThickness);
        }
        this.models['outer'].origin = [-cornerRadius, -cornerRadius];
    }
    return Rimbox;
})();
Rimbox.metaParameters = [
    { title: "width", type: "range", min: 10, max: 500, value: 120 },
    { title: "height", type: "range", min: 10, max: 500, value: 100 },
    { title: "holeRadius", type: "range", min: 1, max: 20, value: 3 },
    { title: "rimThickness", type: "range", min: 1, max: 20, value: 2 },
    { title: "solid", type: "bool", value: false }
];
module.exports = Rimbox;

},{"makerjs":"makerjs"}],"jscad-rimbox":[function(require,module,exports){
var makerjs = require('makerjs');
var rimbox = require('makerjs-rimbox');
var { CAG, CSG } = require('@jscad/csg');

function main(params) {
    var side = new rimbox(params.boltX, params.boltY, params.bodyHoleRadius, params.wallThickness);
    var bottom = new rimbox(params.boltX, params.boltY, params.bodyHoleRadius, params.wallThickness, true);
    var lid = new rimbox(params.boltX, params.boltY, params.bodyHoleRadius, params.wallThickness);
    var lidInset = makerjs.model.outline(lid.models.inner, params.lidInsetClearance, 0, true);
    var lidBolts = new makerjs.models.BoltRectangle(params.boltX, params.boltY, params.lidHoleRadius);

    delete lid.models.inner;
    delete lid.models.bolts;

    if (!params.holeThroughBottom) {
        delete bottom.models.bolts;
    }

    var m = makerjs.measure.modelExtents(side);
    lid.origin = lidInset.origin = lidBolts.origin = [m.high[0] - m.low[0] + params.lidHoleRadius, 0];
    
    var all = {
        models: {
            side,
            bottom,
            lid,
            lidBolts,
            lidInset
        }
    };

    makerjs.model.center(all);
    makerjs.model.originate(all);

    function extrude(model, depth, z) {
        return makerjs.exporter.toJscadCSG(CAG, model, { extrude: depth, maxArcFacet: params.maxArcFacet, z });
    }

    var side3D = extrude(side, params.depth);
    var bottom3D = extrude(bottom, params.bottomThickness);
    var lid3D = extrude(lid, params.lidThickness);

    if (params.lidInsetThickness > 0) {
        var lidInset3D = extrude(lidInset, params.lidInsetThickness, params.lidThickness);
        lid3D = lid3D.union(lidInset3D);
    }

    var lidBolts3D = extrude(lidBolts, params.lidThickness + params.lidInsetThickness);
    lid3D = lid3D.subtract(lidBolts3D);

    return bottom3D.union(side3D).union(lid3D);
}

function getParameterDefinitions() {
    return [
        { name: 'boltX', caption: 'bolt distance (X)', type: 'float', initial: 70 },
        { name: 'boltY', caption: 'bolt distance (Y)', type: 'float', initial: 50 },
        { name: 'depth', caption: 'depth (Z)', type: 'float', initial: 25 },
        { name: 'wallThickness', caption: 'wall thickness', type: 'float', initial: 2 },
        { name: 'bottomThickness', caption: 'bottom thickness', type: 'int', initial: 2 },
        { name: 'bodyHoleRadius', caption: 'hole radius in body', type: 'float', initial: 1.5 },
        { name: 'holeThroughBottom', caption: 'holes go through bottom', type: 'checkbox', checked: true },
        { name: 'lidThickness', caption: 'lid thickness', type: 'float', initial: 2 },
        { name: 'lidHoleRadius', caption: 'hole radius in lid', type: 'float', initial: 2 },
        { name: 'lidInsetThickness', caption: 'lid inset thickness', type: 'float', initial: 1 },
        { name: 'lidInsetClearance', caption: 'lid inset clearance', type: 'float', initial: .25 },
        { name: 'maxArcFacet', caption: 'max arc facet size', type: 'float', initial: .25 }
    ];
}

module.exports = main;
module.exports.getParameterDefinitions = getParameterDefinitions;

},{"@jscad/csg":"@jscad/csg","makerjs":"makerjs","makerjs-rimbox":1}]},{},[]);
