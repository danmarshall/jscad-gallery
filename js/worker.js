//Common interfaces
var commonDependencyUrls = {
    "@jscad/csg": "@jscad/csg/0.3.7.js",
    "makerjs": "makerjs/0.9.78.js"
};
var _module;
var lastResult;
var defaultParams;
var exportLibs = {
    "stl": { url: "jscad-stl-serializer.js", loaded: false }
};
function loadModule(design) {
    var basePath = "../browser_modules/";
    //load dependencies first
    if (design.dependencies.length > 0) {
        design.dependencies.forEach(function (d) {
            for (var name in d) {
                importScripts(basePath + commonDependencyUrls[name]);
            }
        });
    }
    importScripts(basePath + design.title + '/' + design.version + '.js');
    _module = require(design.title);
    var loaded = {};
    if (typeof _module.getParameterDefinitions === 'function') {
        loaded.parameterDefinitions = _module.getParameterDefinitions();
        defaultParams = {};
        loaded.parameterDefinitions.forEach(function (pd) {
            defaultParams[pd.name] = pd.initial;
        });
    }
    var message = { loaded: loaded };
    postMessage(message);
}
function runModule(params) {
    lastResult = _module(params);
    var compactBinary = lastResult.toCompactBinary();
    var message = { ran: { compactBinary: compactBinary } };
    postMessage(message);
}
function exportModule(format) {
    if (!exportLibs[format].loaded) {
        importScripts(exportLibs[format].url);
        exportLibs[format].loaded = true;
    }
    switch (format) {
        case 'stl':
            var stlSerializer = require('@jscad/stl-serializer');
            var solid = lastResult || _module(defaultParams);
            var data = stlSerializer.serialize(solid, { binary: false });
            var message = { exported: { format: format, data: data } };
            postMessage(message);
            break;
    }
}
onmessage = function (e) {
    var cmd = e.data;
    if (cmd.load) {
        loadModule(cmd.load);
    }
    else if (cmd.run) {
        runModule(cmd.run.params);
    }
    else if (cmd["export"]) {
        exportModule(cmd["export"].format);
    }
};
//# sourceMappingURL=worker.js.map