var WebSocketServer = require('ws').Server;
var Variables = require('./variables');

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

Player.prototype.contains = function(point) {
    // Quit before any additional math if there's obviously no way the point is
    // in the player.
    if (Math.abs(point[0] - this.position[0]) > 15 ||
        Math.abs(point[1] - this.position[1]) > 15) {
        return false;
    }
    // Figure out the three corners of the player.  By knowing the player's
    // shape, I can use some short-cuts here to make the math simpler.
    var front = [15 * Math.sin(this.angle * Math.PI/128),
                 -15 * Math.cos(this.angle * Math.PI/128)];
    var right = [10 * Math.SQRT2 * Math.cos((this.angle + 32) * Math.PI/128),
                 10 * Math.SQRT2 * Math.sin((this.angle + 32) * Math.PI/128)];
    var left = [-right[1], right[0]];

    // Move point so it's defined relative to the player's front.
    point = point.slice();
    point[0] -= this.position[0] + front[0];
    point[1] -= this.position[1] + front[1];

    // Get the basis for our new coordinate system
    var basis = [[right[0] - front[0], left[0] - front[0]],
                 [right[1] - front[1], left[1] - front[1]]];
    // Get the adjugate of that basis
    var adjugate = [[basis[1][1], -basis[0][1]],
                    [-basis[1][0], basis[0][0]]];
    // Get the determinant of the basis
    //var determinant = basis[0][0] * basis[1][1] - basis[0][1] * basis[1][0];
    var determinant = 500; // It's always 500, so let's skip that math.

    // Put our point in the new basis
    var pointbasis = [(point[0] * adjugate[0][0] + point[1] * adjugate[0][1])/determinant,
                      (point[0] * adjugate[1][0] + point[1] * adjugate[1][1])/determinant];

    // If either coordinate is negative or their sum is greater than 1, the
    // point isn't inside the triangle.  Otherwise, it is.
    return pointbasis[0] >= 0 && pointbasis[1] >= 0 && pointbasis[0] + pointbasis[1] <= 1;
}

Player.prototype.fire = function() {
    if (this.shots.length < Variables.PLAYER_MAX_SHOTS) {
        var shotPos = this.position.slice();
        shotPos[0] += 15 * Math.sin(this.angle * Math.PI/128);
        shotPos[1] -= 15 * Math.cos(this.angle * Math.PI/128);
        this.shots.push(new Shot(shotPos, this.angle, 6));
        return this.shots[this.shots.length - 1];
    } else {
        return null;
    }
}

Player.prototype.updateShots = function(clients) {
    for (var s in this.shots) {
        this.shots[s].update();
        for (var c in clients) {
            if (clients[c].player.contains(this.shots[s].position)) {
                clients[c].player.position[0] = 100;
                clients[c].player.position[1] = 100;
                clients[c].player.angle = 0;
                this.shots[s].time = -1;
                break;
            }
        }
        if (this.shots[s].time < 0)
            this.shots.splice(s, 1);
    }
}

function Shot(position, angle, speed) {
    this.position = position;
    this.angle = angle;
    this.speed = speed;
    this.velocity = [
        this.speed * Math.sin(this.angle * Math.PI/128),
        -this.speed * Math.cos(this.angle * Math.PI/128)
    ];
    this.time = Variables.SHOT_TIME;
}

Shot.prototype.update = function() {
    this.position[0] += this.velocity[0];
    this.position[1] += this.velocity[1];

    this.time--;
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
                    var shot = this.player.fire();

                    if (shot === null) break;

                    var reply = new Buffer(7);
                    reply[0] = 0x03;
                    reply.writeInt16BE(Math.floor(shot.position[0]*4), 1);
                    reply.writeInt16BE(Math.floor(shot.position[1]*4), 3);
                    reply[5] = shot.angle;
                    reply[6] = shot.speed;
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
            if (wss.clients[c].input & INPUTS.RIGHT) {
                wss.clients[c].player.rotate(Variables.PLAYER_ROTATION_SPEED);
            }
            if (wss.clients[c].input & INPUTS.LEFT) {
                wss.clients[c].player.rotate(-Variables.PLAYER_ROTATION_SPEED);
            }
            if (wss.clients[c].input & INPUTS.UP) {
                wss.clients[c].player.drive(Variables.PLAYER_SPEED);
            }
            if (wss.clients[c].input & INPUTS.DOWN) {
                wss.clients[c].player.drive(-Variables.PLAYER_REVERSE_SPEED);
            }
            wss.clients[c].player.updateShots(wss.clients);
        }
    }, 100/6);
}

exports.start = start;
