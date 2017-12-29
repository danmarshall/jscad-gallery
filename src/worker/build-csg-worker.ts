let _module;

function loadModule(design: Design) {

    const basePath = "../browser_modules/";

    //load dependencies first
    if (design.dependencies.length > 0) {
        design.dependencies.forEach(d => {
            for (let name in d) {
                importScripts(basePath + commonDependencyUrls[name]);
            }
        });
    }

    importScripts(basePath + design.title + '/' + design.version + '.js');

    _module = require(design.title);

    const loaded: LoadedItem = {};
    if (typeof _module.getParameterDefinitions === 'function') {
        loaded.parameterDefinitions = _module.getParameterDefinitions();
    }
    const message: WorkerResponse = { loaded };
    postMessage(message);
}

function runModule(params) {
    const result = _module(params);
    const compactBinary = result.toCompactBinary();
    const message: WorkerResponse = { ran: { compactBinary } };
    postMessage(message);
}

onmessage = function (e) {
    const cmd = e.data as WorkerRequest;
    if (cmd.load) {
        loadModule(cmd.load);
    } else if (cmd.run) {
        runModule(cmd.run.params);
    }
}
