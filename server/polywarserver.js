var fs = require('fs');
var path = require('path');
var WebSocketServer = require('ws').Server;
var Variables = require('./variables');
var Player = require('./player').Player;
var Rectangle = require('./rectangle').Rectangle;

function start(hs) {
    // Make our WebSocket server object
    var wss = new WebSocketServer({server: hs, path: "/polywar-server"});

    var filePath = path.join(__dirname, '/../client/map.json');

    // Read the map
    fs.readFile(filePath, function (err, data) {
        if (err) throw err;

        wss.map = JSON.parse(data);
        for (var r in wss.map.rectangles) {
            wss.map.rectangles[r] = new Rectangle(wss.map.rectangles[r]);
        }
    });

    // Stuff to do when a player connects
    wss.on('connection', function(ws) {
        ws.on('message', function(message) {
            var msg = new Buffer(message);
            switch (msg[0]) {
                // Join
                case 0x00:
                    var reply = [];
                    // Send the new player's info to everyone
                    reply.push(0x00);
                    // Figure out the lowest available ID and assign it
                    // TODO: Nothing stops this from becoming greater than 255
                    for (var id = 0, found = true; found; id++) {
                        found = false;
                        for (var c in wss.clients) {
                            if (id === wss.clients[c].player.id) {
                                found = true;
                                break;
                            }
                        }
                    }
                    this.player.id = --id;
                    reply.push(id);
                    reply.push.apply(reply, this.player.fill);
                    reply.push.apply(reply, this.player.stroke);
                    for (var c in wss.clients) {
                        wss.clients[c].send(new Buffer(reply));
                    }

                    // Send everyone's info to the new player
                    for (var c in wss.clients) {
                        reply = [];
                        if (wss.clients[c].player.id === this.player.id)
                            continue;
                        reply.push(0x00);
                        reply.push(wss.clients[c].player.id);
                        reply.push.apply(reply, wss.clients[c].player.fill);
                        reply.push.apply(reply, wss.clients[c].player.stroke);
                        this.send(new Buffer(reply));
                    }
                    break;

                // Keys
                case 0x01:
                    ws.player.readInput(msg[1]);
                    break;

                // Shot
                case 0x02:
                    var shot = this.player.fire();

                    if (shot === null) break;

                    var reply = new Buffer(9);
                    reply[0] = 0x03;
                    reply[1] = this.player.id;
                    reply[2] = shot.id;
                    reply.writeInt16BE(Math.floor(shot.position[0]*4), 3);
                    reply.writeInt16BE(Math.floor(shot.position[1]*4), 5);
                    reply[7] = shot.angle;
                    reply[8] = shot.speed;
                    for (var c in wss.clients) {
                        wss.clients[c].send(reply);
                    }
                    break;
            }
        });

        // When a client disconnects
        ws.on('close', function() {
            // Notify everyone that this client has disconnected
            var msg = new Buffer([0x01, this.player.id]);
            for (var c in wss.clients) {
                wss.clients[c].send(msg);
            }
        });

        // Give this client a player object
        ws.player = new Player(wss.map);
    });

    // Send updates to the clients
    wss.interval = setInterval(function() {
        var player;
        var reply = new Buffer(1 + 6*wss.clients.length);
        var offset = 1;
        reply[0] = 0x02;
        for (var c in wss.clients) {
            player = wss.clients[c].player;
            reply[offset] = player.id;
            offset += 1;
            reply.writeInt16BE(Math.floor(player.position[0]*4), offset);
            offset += 2;
            reply.writeInt16BE(Math.floor(player.position[1]*4), offset);
            offset += 2;
            reply[offset] = player.angle;
            offset += 1;
        }
        // If a weird race condition occurs and this happens while a client
        // is disconnecting, we don't want the server to crash, so try to
        // send and don't crash if we can't.
        try {
            for (var c in wss.clients) {
                wss.clients[c].send(reply);
            }
        } catch (e) {
            console.log('error caught');
        }

        // Move however the inputs say to move
        for (var c in wss.clients) {
            wss.clients[c].player.updateShots(wss.clients);
            wss.clients[c].player.update();
        }
    }, 1000/Variables.FPS);
}

exports.start = start;
