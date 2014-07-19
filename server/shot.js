var Variables = require('./variables');

function Shot(position, angle, speed) {
    this.id = undefined;
    this.position = position;
    this.angle = angle;
    this.speed = speed;
    this.velocity = [
        this.speed * Math.sin(this.angle * Math.PI/128),
        -this.speed * Math.cos(this.angle * Math.PI/128)
    ];
    this.time = Variables.SHOT_TIME;
}

Shot.prototype.update = function(clients) {
    this.position[0] += this.velocity[0];
    this.position[1] += this.velocity[1];

    this.time--;

    for (var c in clients) {
        if (clients[c].player.contains(this.position)) {
            clients[c].player.position[0] = 100;
            clients[c].player.position[1] = 100;
            clients[c].player.angle = 0;
            this.time = -1;
            break;
        }
    }
}

Shot.prototype.kill = function(id, clients) {
    var msg = new Buffer(3);
    msg[0] = 0x04;
    msg[1] = id;
    msg[2] = this.id;
    for (var c in clients) {
        clients[c].send(msg);
    }
}

exports.Shot = Shot;
