const fs = require("fs");
const path = require("path");
const detective = require("detective");

function getCommonDependencies(dir, common) {
    const main = path.resolve(dir.in, dir.package_json.main);
    const src = fs.readFileSync(main);
    const requires = detective(src);
    const commonRequires = requires.filter(r => common.indexOf(r) >= 0);
    return commonRequires.map(cr => {
        var map = {};
        map[cr] = dir.package_json.dependencies[cr];
        return map;
    });
}

module.exports = {
    getCommonDependencies
};