var WebSocketServer = require('ws').Server;

var INPUTS = {UP: 0x01, DOWN: 0x02, LEFT: 0x04, RIGHT: 0x08, SPACE: 0x10};

function randomColor() {
    return [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255),
            Math.floor(Math.random() * 255)];
}

function Player(position) {
    this.id = undefined;
    this.position = position;
    this.angle = 0;
    this.fill = randomColor();
    this.stroke = randomColor();
    this.shots = [];
}

Player.prototype.rotate = function(dir) {
    this.angle += dir;
}

Player.prototype.drive = function(speed) {
    this.position[0] += speed * Math.sin(this.angle * Math.PI/128);
    this.position[1] -= speed * Math.cos(this.angle * Math.PI/128);
}

Player.prototype.fire = function() {
    this.shots.push(new Shot(this.position, this.angle, 6));
    return this.shots[this.shots.length - 1];
}

function Shot(position, angle, speed) {
    this.position = position;
    this.angle = angle;
    this.speed = speed;
    this.velocity = [
        this.speed * Math.sin(this.angle * Math.PI/128),
        -this.speed * Math.cos(this.angle * Math.PI/128)
    ];
}

Shot.prototype.update = function() {
    this.position[0] += this.velocity[0];
    this.position[1] += this.velocity[1];
}

function start(hs) {
    var wss = new WebSocketServer({server: hs, path: "/polywar-server"});

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
                    // Put the buttons where they will be noticed later
                    ws.input = msg[1];
                    break;

                // Shot
                case 0x02:
                    // TODO: do shotty-things here
                    var shot = this.player.fire();

                    var reply = new Buffer(7);
                    reply[0] = 0x03;
                    reply.writeInt16BE(Math.floor(shot.position[0]*4), 1);
                    reply.writeInt16BE(Math.floor(shot.position[1]*4), 3);
                    reply[5] = shot.speed;
                    reply[6] = shot.angle;
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
        ws.player = new Player([100, 100]);

    });

    // Send updates to this client
    // TODO: Send updates to all clients in the same interval function, so
    // that there's no chance that clients can get different information
    // from one another.
    wss.interval = setInterval(function() {
        var player;
        // TODO: do diffs here so fewer octets can be sent and the
        // variables byte actually has a purpose.  This will make the reply
        // buffer have a non-linear length, unfortunately.
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
            if (wss.clients[c].input & INPUTS.RIGHT) {
                wss.clients[c].player.rotate(1);
            }
            if (wss.clients[c].input & INPUTS.LEFT) {
                wss.clients[c].player.rotate(-1);
            }
            if (wss.clients[c].input & INPUTS.UP) {
                wss.clients[c].player.drive(3);
            }
            if (wss.clients[c].input & INPUTS.DOWN) {
                wss.clients[c].player.drive(-2);
            }
            for (var s in wss.clients[c].shots) {
                wss.clients[c].shots[s].update();
            }
        }
    }, 100/6);
}

exports.start = start;
