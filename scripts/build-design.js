const fs = require("fs");
const path = require("path");
const jsYaml = require("js-yaml");
const package_json = require("../package.json");
const { dirs, formatDate } = require('./dirs');
const { saveCompactBinary } = require('./compact-binary');
const { browserifyDesign } = require('./browserify');
const { getCommonDependencies } = require('./dependencies');
const { launch } = require('./http');
const base64Img = require('base64-img');
const glob = require("glob");

function buildDesign(designTitle, org) {
    const design = {
        title: designTitle
    }
    design.permalink = design.title;

    console.log(`building ${design.title}...`);

    console.log(` creating directory:`);
    const dir = dirs(design.title, org);

    design.author = dir.package_json.author;
    design.version = dir.package_json.version;

    console.log(` generating compact binary`);
    saveCompactBinary(org, design.title, path.resolve(dir.out, 'compact-binary.js'));

    console.log(` browserifying`);
    browserifyDesign(design.title, dir, package_json.common);

    console.log(` getting requires`);
    design.dependencies = getCommonDependencies(dir, package_json.common);

    console.log(` dependencies: ${JSON.stringify(design.dependencies)}`);

    console.log(` launching server with ${JSON.stringify(design)}`);

    launch(design, function (formData) {

        console.log(` form data received`);

        console.log(` writing base64 to png...`);
        var filepath = base64Img.imgSync(formData.image, dir.out, 'thumbnail');

        design.layout = "detail";
        design.image = `/browser_modules/${design.title}/thumbnail.png`;
        design.camera = JSON.parse(formData.camera);

        console.log(` searching for existing post`);
        const pattern = path.resolve(__dirname, '../_posts/') + `/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-${design.title}.md`;
        const matches = glob.sync(pattern);

        console.log(` found ${matches.length} matches`);
        matches.forEach(match => {
            console.log(`  deleting ${match}`);
            fs.unlinkSync(match);
        });

        console.log(` saving as a yaml post`);
        //YEAR-MONTH-DAY-title.MARKUP - https://jekyllrb.com/docs/posts/
        const postFileName = `${formatDate(new Date())}-${design.title}.md`;
        const content = dir.package_json.description;
        const yaml = ['---', jsYaml.dump(design) + '---', content].join('\n');
        fs.writeFileSync(path.resolve(__dirname, '../_posts/', postFileName), yaml);
    });
}

if (require.main === module) {
    //called directly

    const arg = process.argv[2];
    if (arg.startsWith('@')) {
        var split = arg.split('/');
        buildDesign(split[1], split[0]);
    } else {
        buildDesign(designTitle, org);
    }
} else {
    module.exports = buildDesign;
}
