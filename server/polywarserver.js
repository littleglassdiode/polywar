var WebSocketServer = require('ws').Server;

function randomColor() {
    return [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255),
            Math.floor(Math.random() * 255)];
}

function Player(position) {
    this.id = undefined;
    this.pos = position;
    this.angle = 0;
    this.fill = randomColor();
    this.stroke = randomColor();
}

Player.prototype.rotate = function(dir) {
    this.angle += dir;
}

Player.prototype.drive = function(speed) {
    this.pos[0] += speed * Math.sin(this.angle * Math.PI/128);
    this.pos[1] -= speed * Math.cos(this.angle * Math.PI/128);

    // XXX This is just for reducing network traffic
    this.pos[0] = parseFloat(this.pos[0].toFixed(2));
    this.pos[1] = parseFloat(this.pos[1].toFixed(2));
}

function start(hs) {
    var wss = new WebSocketServer({server: hs, path: "/polywar-server"});

    wss.on('connection', function(ws) {
        ws.on('message', function(message) {
            var msg = new Buffer(message);
            var broadcast = false;
            var reply = [];
            switch (msg[0]) {
                case 0x00:
                    broadcast = true;
                    reply.push(0x00);
                    for (var id = 0, found = false; found; id++) {
                        for (var c in wss.clients) {
                            if (id === wss.clients[c].player.id) {
                                found = true;
                                break;
                            }
                        }
                    }
                    reply.push(id);
                    reply.push.apply(reply, this.player.fill);
                    reply.push.apply(reply, this.player.stroke);
                    break;
            }
            if (reply !== []) {
                if (broadcast) {
                    for (var c in wss.clients) {
                        wss.clients[c].send(new Buffer(reply));
                    }
                } else {
                    this.send(new Buffer(reply));
                }
            }
        });

        ws.on('close', function() {
            clearInterval(this.interval);
        });

        ws.player = new Player([100, 100]);

        ws.interval = setInterval(function(ws) {
            try {
                var player;
                var reply = new Buffer(1 + 7*wss.clients.length);
                var offset = 1;
                reply[0] = 0x01;
                for (var c in wss.clients) {
                    player = wss.clients[c].player;
                    reply[offset] = 0;
                    offset += 1;
                    reply[offset] = 0x03;
                    offset += 1;
                    reply.writeUInt16BE(player.pos[0], offset);
                    offset += 2;
                    reply.writeUInt16BE(player.pos[1], offset);
                    offset += 2;
                    reply[offset] = player.angle;
                    offset += 1;
                }
                ws.send(reply);
            } catch (Error) {
                console.log('error caught');
            }

            if (!ws.input)
                return;
            if (ws.input.right) {
                ws.player.rotate(4);
            }
            if (ws.input.left) {
                ws.player.rotate(-4);
            }
            if (ws.input.up) {
                ws.player.drive(6);
            }
            if (ws.input.down) {
                ws.player.drive(-4);
            }
        }, 100/3, ws);
    });
}

exports.start = start;
