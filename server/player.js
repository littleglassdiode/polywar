var Variables = require('./variables');
var Shot = require('./shot').Shot;

var INPUTS = {UP: 0x01, DOWN: 0x02, LEFT: 0x04, RIGHT: 0x08, SPACE: 0x10};

function randomColor() {
    return [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255),
            Math.floor(Math.random() * 255)];
}

function randomDarkColor() {
    return [Math.floor(Math.random() * 127), Math.floor(Math.random() * 127),
            Math.floor(Math.random() * 127)];
}

function randomLightColor() {
    return [Math.floor(128 + Math.random() * 127), Math.floor(128 + Math.random() * 127),
            Math.floor(128 + Math.random() * 127)];
}

function Player(map) {
    this.id = undefined;
    this.spawnPosition = map.properties.spawn.slice();
    this.fill = randomDarkColor();
    this.stroke = randomLightColor();
    this.speed = 0;
    this.spin = 0;
    this.shots = [];
    this.map = map;

    this.front = 0;
    this.right = 0;
    this.left = 0;
    this.adjugate = 0;
    this.determinant = 0;

    this.spawn();
}

Player.prototype.spawn = function() {
    this.position = this.spawnPosition.slice();
    this.angle = 0;
    this.recalculateContains = true;
}

Player.prototype.readInput = function(input) {
    this.speed = 0;
    this.spin = 0;
    if (input & INPUTS.RIGHT) {
        this.spin += Variables.PLAYER_ROTATION_SPEED;
    }
    if (input & INPUTS.LEFT) {
        this.spin -= Variables.PLAYER_ROTATION_SPEED;
    }
    if (input & INPUTS.UP) {
        this.speed += Variables.PLAYER_SPEED;
    }
    if (input & INPUTS.DOWN) {
        this.speed += Variables.PLAYER_REVERSE_SPEED;
    }
}

Player.prototype.update = function() {
    this.angle += this.spin;
    this.angle %= 256;
    // Turn the remainder into a real modulo
    if (this.angle < 0) {
        this.angle += 256;
    }

    var oldPosition = this.position.slice();

    this.position[0] += this.speed * Math.sin(this.angle * Math.PI/128);
    this.position[1] -= this.speed * Math.cos(this.angle * Math.PI/128);
    if (this.position[0] < -this.map.properties.size[0])
        this.position[0] = -this.map.properties.size[0];
    if (this.position[1] < -this.map.properties.size[1])
        this.position[1] = -this.map.properties.size[1];
    if (this.position[0] > this.map.properties.size[0])
        this.position[0] = this.map.properties.size[0];
    if (this.position[1] > this.map.properties.size[1])
        this.position[1] = this.map.properties.size[1];

    if (this.spin != 0 || this.speed != 0) {
        this.recalculateContains = true;

        for (r in this.map.rectangles) {
            if (this.map.rectangles[r].contains(this.position)) {
                this.position = oldPosition;
            }
        }
    }
}

Player.prototype.contains = function(point) {
    // Quit before any additional math if there's obviously no way the point is
    // in the player.
    if (Math.abs(point[0] - this.position[0]) > 19 ||
        Math.abs(point[1] - this.position[1]) > 19) {
        return false;
    }

    if (this.recalculateContains) {
        // Calculate sine and cosine of the player's angle
        this.rotatevec = [Math.sin(this.angle * Math.PI/128),
                          Math.cos(this.angle * Math.PI/128)];
        this.recalculateContains = false;
    }

    // Move point so it's defined relative to the player's center
    point = point.slice();
    point[0] -= this.position[0];
    point[1] -= this.position[1];

    // Rotate our point so it's defined in the same coordinates as the player's
    // corners.
    var pointbasis = [point[0] * this.rotatevec[1] - point[1] * this.rotatevec[0],
                      point[0] * this.rotatevec[0] + point[1] * this.rotatevec[1]];

    // Return whether pointbasis is inside the player's boundaries
    return pointbasis[0] >= -10 && pointbasis[1] >= -16 && pointbasis[0] <= 10 && pointbasis[1] <= 16;
}

Player.prototype.fire = function() {
    if (this.shots.length < Variables.PLAYER_MAX_SHOTS) {
        var shotPos = this.position.slice();
        shotPos[0] += 20 * Math.sin(this.angle * Math.PI/128);
        shotPos[1] -= 20 * Math.cos(this.angle * Math.PI/128);
        var shot = new Shot(shotPos, this.angle, 6 + this.speed, this.map);

        // Same ID hack as used when creating a player
        for (var id = 0, found = true; found; id++) {
            found = false;
            for (var s in this.shots) {
                if (id === this.shots[s].id) {
                    found = true;
                    break;
                }
            }
        }
        shot.id = --id;

        this.shots.push(shot);
        return shot;
    } else {
        return null;
    }
}

Player.prototype.updateShots = function(clients) {
    for (var s in this.shots) {
        this.shots[s].update(clients);
        if (this.shots[s].time < 0) {
            this.shots[s].kill(this.id, clients);
            this.shots.splice(s, 1);
        }
    }
}

exports.Player = Player;
