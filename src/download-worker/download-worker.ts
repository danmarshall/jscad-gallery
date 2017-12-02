let compactBinary;

function downloadPreviewCompactBinary(design: Design) {
    const url = `/browser_modules/${design.title}/compact-binary.js`;
    importScripts(url)
    const message: DownloadResponse = {
        preview: {
            design,
            compactBinary
        }
    };
    postMessage(message);
}

onmessage = function (e) {
    const cmd = e.data as DownloadRequest;
    if (cmd.preview) {
        downloadPreviewCompactBinary(cmd.preview);
    }
}
