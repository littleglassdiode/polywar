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

Shot.prototype.update = function() {
    this.position[0] += this.velocity[0];
    this.position[1] += this.velocity[1];

    this.time--;
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
