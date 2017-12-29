//Common interfaces
var commonDependencyUrls = {
    "@jscad/csg": "@jscad/csg/0.3.7.js",
    "makerjs": "makerjs/0.9.78.js"
};
var _module;
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
    }
    var message = { loaded: loaded };
    postMessage(message);
}
function runModule(params) {
    var result = _module(params);
    var compactBinary = result.toCompactBinary();
    var message = { ran: { compactBinary: compactBinary } };
    postMessage(message);
}
onmessage = function (e) {
    var cmd = e.data;
    if (cmd.load) {
        loadModule(cmd.load);
    }
    else if (cmd.run) {
        runModule(cmd.run.params);
    }
};
//# sourceMappingURL=worker.js.map