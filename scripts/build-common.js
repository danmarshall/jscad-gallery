const fs = require("fs");
const path = require("path");
const browserify = require('browserify');
const package_json = require("../package.json");

function browserifyCommon(name, depPackageJson) {
    const main = path.resolve(__dirname, '../node_modules', name, depPackageJson.main);
    const dirOut = path.resolve(__dirname, '../browser_modules', name);
    if (!fs.existsSync(dirOut)) {
        fs.mkdirSync(dirOut);
    }
    const outfile = path.resolve(__dirname, '../browser_modules', name, depPackageJson.version + '.js');
    const ws = fs.createWriteStream(outfile);
    const b = browserify();
    b.require(main, { expose: name });
    b.bundle().pipe(ws);
}

function getDepPackage(name) {
    return require(path.resolve(__dirname, '../node_modules', name, 'package.json'));
}

const manifest = {};

package_json.common.forEach(name => {
    let depPackageJson = getDepPackage(name);
    browserifyCommon(name, depPackageJson);
    manifest[name] = `${name}/${depPackageJson.version}.js`;
});

fs.writeFileSync(path.resolve(__dirname, '../src/worker/manifest.ts'), `let commonDependencyUrls = ${JSON.stringify(manifest, null, 2)};`);
