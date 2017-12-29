//Common interfaces
var compactBinary;
function downloadPreviewCompactBinary(design) {
    var url = "../browser_modules/" + design.title + "/compact-binary.js";
    importScripts(url);
    var message = {
        preview: {
            design: design,
            compactBinary: compactBinary
        }
    };
    postMessage(message);
}
onmessage = function (e) {
    var cmd = e.data;
    if (cmd.preview) {
        downloadPreviewCompactBinary(cmd.preview);
    }
};
//# sourceMappingURL=download-worker.js.map