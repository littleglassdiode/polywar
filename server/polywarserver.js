var WebSocketServer = require('ws').Server;

var INPUTS = {UP: 0x01, DOWN: 0x02, LEFT: 0x04, RIGHT: 0x08};

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
            var reply = [];
            switch (msg[0]) {
                case 0x00:
                    // Send the new player's info to everyone
                    reply.push(0x00);
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

                case 0x01:
                    ws.input = msg[1];
                    break;
            }
        });

        ws.on('close', function(ws) {
            var msg = new Buffer([0x01, this.player.id]);
            for (var c in wss.clients) {
                wss.clients[c].send(msg);
            }
            clearInterval(this.interval);
        }, ws);

        ws.player = new Player([100, 100]);

        ws.interval = setInterval(function(ws) {
            var player;
            var reply = new Buffer(1 + 7*wss.clients.length);
            var offset = 1;
            reply[0] = 0x02;
            for (var c in wss.clients) {
                player = wss.clients[c].player;
                reply[offset] = player.id;
                offset += 1;
                reply[offset] = 0x07;
                offset += 1;
                reply.writeInt16BE(Math.floor(player.pos[0]*4), offset);
                offset += 2;
                reply.writeInt16BE(Math.floor(player.pos[1]*4), offset);
                offset += 2;
                reply[offset] = player.angle;
                offset += 1;
            }
            try {
                ws.send(reply);
            } catch (Error) {
                console.log('error caught');
            }

            if (!ws.input)
                return;
            if (ws.input & INPUTS.RIGHT) {
                ws.player.rotate(4);
            }
            if (ws.input & INPUTS.LEFT) {
                ws.player.rotate(-4);
            }
            if (ws.input & INPUTS.UP) {
                ws.player.drive(6);
            }
            if (ws.input & INPUTS.DOWN) {
                ws.player.drive(-4);
            }
        }, 100/3, ws);
    });
}

exports.start = start;
