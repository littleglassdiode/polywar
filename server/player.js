var Variables = require('./variables');
var Shot = require('./shot').Shot;

var INPUTS = {UP: 0x01, DOWN: 0x02, LEFT: 0x04, RIGHT: 0x08, SPACE: 0x10};

function randomColor() {
    return [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255),
            Math.floor(Math.random() * 255)];
}

function Player(map) {
    this.id = undefined;
    this.spawnPosition = map.properties.spawn.slice();
    this.fill = randomColor();
    this.stroke = randomColor();
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
    if (Math.abs(point[0] - this.position[0]) > 15 ||
        Math.abs(point[1] - this.position[1]) > 15) {
        return false;
    }

    if (this.recalculateContains) {
        // Figure out the three corners of the player.  By knowing the player's
        // shape, we can use some short-cuts here to make the math simpler.
        this.front = [15 * Math.sin(this.angle * Math.PI/128),
                     -15 * Math.cos(this.angle * Math.PI/128)];
        this.right = [10 * Math.SQRT2 * Math.cos((this.angle + 32) * Math.PI/128),
                     10 * Math.SQRT2 * Math.sin((this.angle + 32) * Math.PI/128)];
        this.left = [-this.right[1], this.right[0]];
        // Get the basis for our new coordinate system.
        // Commented out because we don't actually need the basis ever.
        //var basis = [[right[0] - front[0], left[0] - front[0]],
        //             [right[1] - front[1], left[1] - front[1]]];
        // Get the adjugate of that basis
        this.adjugate = [[this.left[1] - this.front[1], this.front[0] - this.left[0]],
                     [this.front[1] - this.right[1], this.right[0] - this.front[0]]];
        // Get the determinant of the basis.
        // The determinant of the adjugate is the same thing.
        //var determinant = basis[0][0] * basis[1][1] - basis[0][1] * basis[1][0];
        this.determinant = 500; // It's always 500, so let's skip that math.

        this.recalculateContains = false;
    }

    // Move point so it's defined relative to the player's front.
    point = point.slice();
    point[0] -= this.position[0] + this.front[0];
    point[1] -= this.position[1] + this.front[1];

    // Put our point in the new basis.
    var pointbasis = [(point[0] * this.adjugate[0][0] + point[1] * this.adjugate[0][1])/this.determinant,
                      (point[0] * this.adjugate[1][0] + point[1] * this.adjugate[1][1])/this.determinant];

    // If either coordinate is negative or their sum is greater than 1, the
    // point isn't inside the triangle.  Otherwise, it is.
    return pointbasis[0] >= 0 && pointbasis[1] >= 0 && pointbasis[0] + pointbasis[1] <= 1;
}

Player.prototype.fire = function() {
    if (this.shots.length < Variables.PLAYER_MAX_SHOTS) {
        var shotPos = this.position.slice();
        shotPos[0] += 15 * Math.sin(this.angle * Math.PI/128);
        shotPos[1] -= 15 * Math.cos(this.angle * Math.PI/128);
        var shot = new Shot(shotPos, this.angle, 6 + this.speed);

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
        for (var r in this.map.rectangles) {
            if (this.map.rectangles[r].contains(this.shots[s].position)) {
                this.shots[s].time = -1;
                break;
            }
        }
        if (this.shots[s].time < 0) {
            this.shots[s].kill(this.id, clients);
            this.shots.splice(s, 1);
        }
    }
}

exports.Player = Player;
