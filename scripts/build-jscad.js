const fs = require("fs");
const path = require("path");
const includify = require('jscad-includify');
const readlineSync = require('readline-sync');
const child_process = require('child_process');
const package_json = require("../package.json");
const org = '@jscad-gallery';
const jscadfile = process.argv[2];

function getFileNameWithoutExtension() {
    const ext = path.extname(jscadfile);
    return path.basename(jscadfile, ext);
}

const designTitle = getFileNameWithoutExtension();
const jscad_modulesDir = path.resolve(__dirname, '../node_modules', org);
if (!fs.existsSync(jscad_modulesDir)) {
    fs.mkdirSync(jscad_modulesDir);
}

const dirOut = path.resolve(jscad_modulesDir, designTitle);
if (!fs.existsSync(dirOut)) {
    fs.mkdirSync(dirOut);
}

console.log(`jscad file is ${jscadfile}`);
console.log(`module name is ${designTitle}`);

const author = process.argv[3] || readlineSync.question('author:');
const description = process.argv[4] || readlineSync.question('description:');

var jscad_package_json = {
    "name": designTitle,
    "version": "1.0.0",
    "description": description,
    "main": "index.js",
    "dependencies": {
        "@jscad/scad-api": package_json.devDependencies["@jscad/scad-api"]
    },
    "author": author,
    "license": "MIT"
}

includify.runFile(jscadfile, (error, includes, code) => {
    if (error) {
        console.log(`ERROR: ${error}`);
        return;
    }
    const moduleTemplatePath = path.resolve(__dirname, 'jscad-module-template.js');
    const moduleTemplate = fs.readFileSync(moduleTemplatePath, 'utf8');
    const js = moduleTemplate.replace('//CONTENT', code);
    fs.writeFileSync(path.resolve(dirOut, 'index.js'), js);
    fs.writeFileSync(path.resolve(dirOut, 'package.json'), JSON.stringify(jscad_package_json, null, 2));

    child_process.fork(path.resolve(__dirname, './build-design.js'), [`${org}/${designTitle}`]);
});
