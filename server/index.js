process.title = "polywar";

var httpserver = require('./httpserver');
var polywarserver = require('./polywarserver');

var hs = httpserver.start(8080);
polywarserver.start(hs);
