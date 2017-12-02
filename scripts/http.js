const fs = require('fs');
const path = require("path");
const http = require('http');
const opn = require('opn');
const qs = require('querystring');

function contentType(ext) {
    switch (ext) {
        case '.css':
            return 'text/css';
        case '.js':
            return 'text/javascript';
    }
    return 'unknown';
}

function launch(design, done) {
    const server = http.createServer(function (req, res) {
        if (req.method == 'POST') {
            var body = '';
            req.on('data', function (data) { body += data; });
            req.on('end', function () { done(qs.parse(body)); });
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><button onclick="window.close()">Success! Close this window</button><p>If the script does not terminate, you may need to close all browser tabs.</p></body><html>');
            server.removeAllListeners();
            server.close();
        }
        else {
            console.log("GET");
            if (req.url === '/') {
                var html = fs.readFileSync(path.resolve(__dirname, 'screenshot.html'), 'utf8')
                    .replace('_DESIGN_', JSON.stringify(design))
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            } else {
                try {
                    var ext = req.url.substring(req.url.lastIndexOf('.'));
                    console.log(`EXT: ${ext}`);
                    var f = path.resolve(__dirname, '..', req.url.substring(1));
                    console.log(f);
                    res.writeHead(200, { 'Content-Type': contentType(ext) });
                    res.write(fs.readFileSync(f), function () { res.end(); });
                } catch (e) {
                    res.writeHead(404);
                    res.end();
                }
            }
        }

    });

    port = 3000;
    host = '127.0.0.1';
    server.listen(port, host);
    console.log('Listening at http://' + host + ':' + port);
    console.log(__dirname);

    opn(`http://${host}:${port}`);
}

module.exports = {
    launch
};
