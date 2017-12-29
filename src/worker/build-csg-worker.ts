let _module;
let lastResult;
let defaultParams: { [name: string]: any };

const exportLibs: { [format: string]: { url: string, loaded: boolean } } = {
    "stl": { url: "jscad-stl-serializer.js", loaded: false }
};

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
        defaultParams = {};
        loaded.parameterDefinitions.forEach(pd => {
            defaultParams[pd.name] = pd.initial;
        });
    }
    const message: WorkerResponse = { loaded };
    postMessage(message);
}

function runModule(params) {
    lastResult = _module(params);
    const compactBinary = lastResult.toCompactBinary();
    const message: WorkerResponse = { ran: { compactBinary } };
    postMessage(message);
}

function statusCallback(status) {
    const message: WorkerResponse = {
        exportProgress: status.progress
    };
    postMessage(message);
}

function exportModule(format: string) {
    if (!exportLibs[format].loaded) {
        importScripts(exportLibs[format].url);
        exportLibs[format].loaded = true;
    }
    switch (format) {
        case 'stl':
            const stlSerializer = require('@jscad/stl-serializer');
            const solid = lastResult || _module(defaultParams);
            const data = stlSerializer.serialize(solid, { binary: false, statusCallback });
            const message: WorkerResponse = { exported: { format, data } };
            postMessage(message);
            break;
    }
}

onmessage = function (e) {
    const cmd = e.data as WorkerRequest;
    if (cmd.load) {
        loadModule(cmd.load);
    } else if (cmd.run) {
        runModule(cmd.run.params);
    } else if (cmd.export) {
        exportModule(cmd.export.format);
    }
}
