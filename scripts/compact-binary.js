const fs = require("fs");
var serialize = require('serialize-to-js').serialize;

function getCompactBinary(org, moduleName) {
    const orgPath = org ? org + '/' : '';
    const _module = require(orgPath + moduleName);
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

function saveCompactBinary(org, moduleName, fullPath) {
    const compactBinary = getCompactBinary(org, moduleName);
    const content = 'compactBinary=' + serialize(compactBinary);
    fs.writeFileSync(fullPath, content);
}

module.exports = { getCompactBinary, saveCompactBinary };
