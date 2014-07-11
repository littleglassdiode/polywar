var KEY = {D: 68, W: 87, A: 65, S:83, RIGHT:39, UP:38, LEFT:37, DOWN:40};
var input = {
    right: false,
    up: false,
    left: false,
    down: false,
};

function press(evt) {
    var code = evt.keyCode;
    switch (code) {
        case KEY.RIGHT:
        case KEY.D: input.right = true; break;
        
        case KEY.UP:
        case KEY.W: input.up = true; break;
        
        case KEY.LEFT:
        case KEY.A: input.left = true; break;
        
        case KEY.DOWN: 
        case KEY.S: input.down = true; break;
    }
}

function release(evt) {
    var code = evt.keyCode;
    switch (code) {
        case KEY.RIGHT:
        case KEY.D: input.right = false; break;
        
        case KEY.UP:
        case KEY.W: input.up = false; break;
        
        case KEY.LEFT:
        case KEY.A: input.left = false; break;
        
        case KEY.DOWN:
        case KEY.S: input.down = false; break;
    }
}
function Player() {
    this.position = [100, 100];
    this.angle = 0;
    this.color = "#090";
    this.lineColor = "#0e0";
}

Player.prototype.draw = function(ctx) {
    ctx.save();

    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = 2;

    ctx.translate(this.position[0], this.position[1]);
    ctx.rotate(this.angle);

    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(10, 10);
    ctx.lineTo(-10, 10);
    ctx.fill();
    ctx.lineTo(0, -15);
    ctx.lineTo(10, 10);
    ctx.stroke();

    ctx.restore();
}

Player.prototype.rotate = function(dir) {
    this.angle += dir;
}

Player.prototype.drive = function(speed) {
    this.position[0] += speed * Math.sin(this.angle);
    this.position[1] -= speed * Math.cos(this.angle);
}

function drawGame(player) {
    var c = document.getElementById("polywarCanvas");
    var ctx = c.getContext("2d");

    if (input.right) {
        player.rotate(Math.PI/30);
    }
    if (input.left) {
        player.rotate(-Math.PI/30);
    }
    if (input.up) {
        player.drive(6);
    }
    if (input.down) {
        player.drive(-4);
    }

    c.width = c.width;
    player.draw(ctx);

    setTimeout(function(){drawGame(player)},100/3);
}

window.onload = function() {
    document.addEventListener("keydown", press, true);
    document.addEventListener("keyup", release, true);
    var p1 = new Player();
    drawGame(p1);
}
