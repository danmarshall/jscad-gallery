const fs = require("fs");
const path = require("path");
const browserify = require('browserify');

function browserifyDesign(designName, dir, common) {
    const main = path.resolve(dir.in, dir.package_json.main);
    const outfile = path.resolve(dir.out, dir.package_json.version + '.js');
    const ws = fs.createWriteStream(outfile);
    const b = browserify();
    b.require(main, { expose: designName });
    common.forEach(m => b.external(m));
    b.bundle().pipe(ws);
}

module.exports = {
    browserifyDesign
};