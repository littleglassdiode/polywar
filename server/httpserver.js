var http = require('http');
var path = require('path');
var fs = require('fs');
var url = require('url');

function start() {
    function handleRequest(request, response) {
        var pathname = url.parse(request.url).pathname;
        if (pathname === '/' || pathname === '/index.html') {
            var filePath = path.join(__dirname, '/../client/index.html');
            var stat = fs.statSync(filePath);

            response.writeHead(200, {
                'Content-Type': 'text/html',
                'Content-Length': stat.size
            });

            var readStream = fs.createReadStream(filePath);
            // We replaced all the event handlers with a simple call to readStream.pipe()
            readStream.pipe(response);
        } else if (pathname === '/polywar.js') {
            var filePath = path.join(__dirname, '/../client/polywar.js');
            var stat = fs.statSync(filePath);

            response.writeHead(200, {
                'Content-Type': 'application/javascript',
                'Content-Length': stat.size
            });

            var readStream = fs.createReadStream(filePath);
            // We replaced all the event handlers with a simple call to readStream.pipe()
            readStream.pipe(response);
        }
    }

    var server = http.createServer(handleRequest);
    server.listen(8080);

    return server;
}

exports.start = start;
