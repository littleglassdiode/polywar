process.title = "polywar";

var httpserver = require('./httpserver');
var polywarserver = require('./polywarserver');

var hs = httpserver.start();
polywarserver.start(hs);
