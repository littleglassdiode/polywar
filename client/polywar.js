var KEY = {D: 68, W: 87, A: 65, S:83, RIGHT:39, UP:38, LEFT:37, DOWN:40};
var input = {
    right: false,
    up: false,
    left: false,
    down: false,
};

function press(evt) {
    var code = evt.keyCode;
    var send = true;
    switch (code) {
        case KEY.RIGHT:
        case KEY.D: input.right = true; break;
        
        case KEY.UP:
        case KEY.W: input.up = true; break;
        
        case KEY.LEFT:
        case KEY.A: input.left = true; break;
        
        case KEY.DOWN: 
        case KEY.S: input.down = true; break;

        default: send = false; break;
    }
    if (send)
        server.send(JSON.stringify(input));
}

function release(evt) {
    var code = evt.keyCode;
    var send = true;
    switch (code) {
        case KEY.RIGHT:
        case KEY.D: input.right = false; break;
        
        case KEY.UP:
        case KEY.W: input.up = false; break;
        
        case KEY.LEFT:
        case KEY.A: input.left = false; break;
        
        case KEY.DOWN:
        case KEY.S: input.down = false; break;

        default: send = false; break;
    }
    if (send)
        server.send(JSON.stringify(input));
}

function drawPlayer(player, ctx) {
    if (player === "no")
        return;

    ctx.save();

    ctx.fillStyle = player.color;
    ctx.strokeStyle = player.lineColor;
    ctx.lineWidth = 2;

    ctx.translate(player.position[0], player.position[1]);
    ctx.rotate(player.angle);

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

var server = new WebSocket("ws://" + window.location.host + "/polywar-server");

server.onmessage = function drawGame(event) {
    var c = document.getElementById("polywarCanvas");
    var ctx = c.getContext("2d");

    var players = JSON.parse(event.data);

    c.width = c.width;
    for (var p = 0; p < players.length; p++) {
        drawPlayer(players[p], ctx);
    }
}

window.onload = function() {
    document.addEventListener("keydown", press, true);
    document.addEventListener("keyup", release, true);
}
