const fs = require("fs");
var serialize = require('serialize-to-js').serialize;

function getCompactBinary(moduleName) {
    const _module = require(moduleName);
    const params = {};
    if (typeof _module.getParameterDefinitions === 'function') {
        const defs = _module.getParameterDefinitions();
        defs.forEach(function (def) {
            params[def.name] = def.initial;
        });
    }
    const result = _module(params);
    const compactBinary = result.toCompactBinary();
    return compactBinary;
}

function saveCompactBinary(moduleName, fullPath) {
    const compactBinary = getCompactBinary(moduleName);
    const content = 'compactBinary=' + serialize(compactBinary);
    fs.writeFileSync(fullPath, content);
}

module.exports = { getCompactBinary, saveCompactBinary };
