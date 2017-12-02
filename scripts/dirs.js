const fs = require("fs");
const path = require("path");

function dirs(designName) {
    const dirIn = path.resolve(__dirname, '../node_modules', designName);
    const dirOut = path.resolve(__dirname, '../browser_modules', designName);
    if (!fs.existsSync(dirOut)) {
        fs.mkdirSync(dirOut);
    }
    const designPackageJson = require(path.resolve(dirIn, 'package.json'));
    return { in: dirIn, out: dirOut, package_json: designPackageJson };
}

function formatDate(d) {
    var month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

module.exports = {
    dirs,
    formatDate
};
