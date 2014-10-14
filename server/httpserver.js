var http = require('http');
var path = require('path');
var fs = require('fs');
var url = require('url');

function start(port) {
    function handleRequest(request, response) {
        var pathname = url.parse(request.url).pathname;
        if (pathname === '/')
            pathname = '/index.html';
        var ext = path.extname(pathname);
        var contentType = 'text/plain';
        if (ext === '.html') {
            contentType = 'text/html';
        } else if (ext === '.js') {
            contentType = 'application/javascript';
        } else if (ext === '.css') {
            contentType = 'text/css';
        } else if (ext === '.png') {
            contentType = 'image/png';
        } else if (ext === '.json') {
            contentType = 'application/json';
        }

        // Get the path separator to the right character for this OS
        pathname = path.join.apply(this, pathname.split('/'));
        // Get the right path for the file requested
        var filePath = path.join(__dirname, '..', 'client', pathname);
        try {
            var stat = fs.statSync(filePath);

            response.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': stat.size
            });

            var readStream = fs.createReadStream(filePath);
            // We replaced all the event handlers with a simple call to readStream.pipe()
            readStream.pipe(response);
        } catch (Error) {
            response.writeHead(404, {'Content-Type': 'text/plain'});
            response.write('404');
            response.end();
        }
    }

    var server = http.createServer(handleRequest);
    server.listen(port);

    return server;
}

exports.start = start;
